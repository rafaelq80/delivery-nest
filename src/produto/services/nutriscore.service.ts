import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class NutriScoreService {
  private readonly logger = new Logger(NutriScoreService.name);

  private readonly nutrientRanges = {
    energia: [[335], [670], [1005], [1340], [1675], [2010], [2345], [2680], [3015], [3350]],
    acucar: [[4.5], [9], [13.5], [18], [22.5]],
    gordurasSaturadas: [[1], [2], [3], [4], [5]],
    sodio: [[90], [180], [270], [360], [450]],
    proteinas: [[4.8], [6.4], [8]],
    fibras: [[2.8], [3.7], [4.7]],
    frutasLegumesOleaginosas: [[10], [20], [40], [60], [80]],
  };

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async pesquisarNutriScore(produto: string): Promise<string> {
    const prompt = this.criarPrompt(produto.trim());
    const dadosNutricionais = await this.chamarGroqAPI(prompt);
    return this.calcularNutriScore(dadosNutricionais);
  }

  private criarPrompt(produto: string): string {
    return `Forneça as informações nutricionais médias por 100g do produto "${produto}".
Responda APENAS com um JSON válido, sem texto adicional, no seguinte formato:
{
  "valorEnergetico": 0,
  "acucaresTotais": 0,
  "gordurasSaturadas": 0,
  "sodio": 0,
  "proteinas": 0,
  "fibrasAlimentares": 0,
  "percentualFrutasLegumesOleaginosas": 0
}
Onde:
- valorEnergetico: valor energético em kcal
- acucaresTotais: açúcares totais em g
- gordurasSaturadas: gorduras saturadas em g
- sodio: teor de sódio em mg
- proteinas: proteínas em g
- fibrasAlimentares: fibras alimentares em g
- percentualFrutasLegumesOleaginosas: percentual de frutas, legumes e oleaginosas em %
Se houver variação dependendo do preparo, use a média geral ou o maior valor.`;
  }

  private async chamarGroqAPI(prompt: string): Promise<NutriScoreData> {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    const apiUrl = this.configService.get<string>('GROQ_API_URL');
    const model = this.configService.get<string>('GROQ_MODEL');

    if (!apiKey || !apiUrl) {
      throw new HttpException('Configuração de API inválida.', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          apiUrl,
          {
            model: model || 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.3,
            response_format: { type: 'json_object' },
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000,
          },
        ),
      );

      const content = response.data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new HttpException('Sem resposta válida da API Groq.', HttpStatus.NO_CONTENT);
      }

      const dados = JSON.parse(content) as NutriScoreData;
      this.logger.log('Dados Nutricionais:', dados);
      return dados;
    } catch (error: any) {
      if (error instanceof HttpException) throw error;

      this.logger.error('Erro na chamada da API Groq', error?.response?.data ?? error?.message);

      if (error?.response) {
        throw new HttpException(
          error.response.data?.error?.message || 'Erro na API Groq',
          error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      throw new HttpException(
        'Falha na comunicação com a API Groq',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private calcularNutriScore(dados: NutriScoreData): string {
    const calcularPontos = (valor: number, ranges: number[][]): number => {
      const index = ranges.findIndex((range) => valor <= range[0]);
      return index !== -1 ? index : ranges.length;
    };

    const pontosNegativos = [
      calcularPontos(dados.valorEnergetico, this.nutrientRanges.energia),
      calcularPontos(dados.acucaresTotais, this.nutrientRanges.acucar),
      calcularPontos(dados.gordurasSaturadas, this.nutrientRanges.gordurasSaturadas),
      calcularPontos(dados.sodio, this.nutrientRanges.sodio),
    ].reduce((a, b) => a + b, 0);

    const pontosPositivos = [
      calcularPontos(dados.proteinas, this.nutrientRanges.proteinas),
      calcularPontos(dados.fibrasAlimentares, this.nutrientRanges.fibras),
      calcularPontos(dados.percentualFrutasLegumesOleaginosas, this.nutrientRanges.frutasLegumesOleaginosas),
    ].reduce((a, b) => a + b, 0);

    const pontuacaoFinal = pontosNegativos - pontosPositivos;

    if (pontuacaoFinal <= -1) return 'A';
    if (pontuacaoFinal <= 0)  return 'B';
    if (pontuacaoFinal <= 2)  return 'C';
    if (pontuacaoFinal <= 4)  return 'D';
    return 'E';
  }
}