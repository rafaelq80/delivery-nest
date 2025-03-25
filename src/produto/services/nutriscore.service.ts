import { HttpService } from '@nestjs/axios';
import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class NutriScoreService {
  private readonly logger = new Logger(NutriScoreService.name);
  private readonly nutrientRanges = {
    energia: [
      [335],
      [670],
      [1005],
      [1340],
      [1675],
      [2010],
      [2345],
      [2680],
      [3015],
      [3350],
    ],
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
    const resposta = await this.chamarGeminiAPI(prompt);

    this.logger.log(resposta);

    const dadosNutricionais = this.obterDadosNutricionais(resposta);

    this.logger.log('Dados Nutricionais:', dadosNutricionais);

    return this.calcularNutriScore(dadosNutricionais);
  }

  private criarPrompt(produto: string): string {
    return `Forneça informações nutricionais médias por 100g do prato ${produto}. 
            Inclua: valor energético (kcal), açúcares (g), gordura saturada (g), 
            teor de sódio (mg), proteínas (g), fibras alimentares (g), 
            percentual de frutas, legumes e oleaginosas (%).
            Se possível, baseie-se em fontes confiáveis, como tabelas nutricionais oficiais 
            ou informações de rótulos de produtos similares. 
            Caso haja variações dependendo do preparo, forneça uma média geral ou o maior valor
            no caso de um intervalo de valores.
            Não traga as informações nutricionais na forma de tabela.`;
  }

  private async chamarGeminiAPI(prompt: string): Promise<string> {
    const API_KEY = this.configService.get<string>('API_KEY');
    const API_URL = this.configService.get<string>('API_URL');

    if (!API_KEY) {
      throw new HttpException(
        'API Gemini não configurada',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          `${API_URL}?key=${API_KEY}`,
          { contents: [{ parts: [{ text: prompt }] }] },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (!response.data.candidates?.length) {
        throw new HttpException('Sem respostas válidas', HttpStatus.NO_CONTENT);
      }

      return response.data.candidates[0].content.parts[0].text;
    } catch (error) {
      this.handleGeminiAPIError(error);
    }
  }

  // private obterDadosNutricionais(resposta: string): NutriScoreData {
  //   const extrairValor = (padrao: RegExp): number => {
  //     const match = resposta.match(padrao);
  //     if (!match) return 0;

  //     const valores = match[1].split('-').map((v) =>
  //       parseFloat(
  //         v
  //           .trim()
  //           .replace(',', '.')
  //           .replace(/[^\d.]/g, ''),
  //       ),
  //     );

  //     const valorFinal = valores.length > 1 ? Math.max(...valores) : valores[0];

  //     return isNaN(valorFinal) ? 0 : valorFinal;
  //   };

  //   return {
  //     valorEnergetico: extrairValor(
  //       /Valor energético.*?(\d+(?:,\d+)?(?:\s*-\s*\d+(?:,\d+)?)?)\s*kcal/i,
  //     ),
  //     acucaresTotais: extrairValor(
  //       /Açúcares totais.*?(\d+(?:,\d+)?(?:\s*-\s*\d+(?:,\d+)?)?)\s*g/i,
  //     ),
  //     gordurasSaturadas: extrairValor(
  //       /(?:teor de )?gordura(?:s)? saturada(?:s)?.*?(\d+(?:,\d+)?(?:\s*-\s*\d+(?:,\d+)?)?)\s*g/i,
  //     ),
  //     sodio: extrairValor(
  //       /Sódio.*?(\d+(?:,\d+)?(?:\s*-\s*\d+(?:,\d+)?)?)\s*mg/i,
  //     ),
  //     proteinas: extrairValor(
  //       /(?:Proteína(?:s)?.*?)?(\d+(?:,\d+)?(?:\s*-\s*\d+(?:,\d+)?)?)\s*g/i,
  //     ),
  //     fibrasAlimentares: extrairValor(
  //       /Fibras alimentares.*?(\d+(?:,\d+)?(?:\s*-\s*\d+(?:,\d+)?)?)\s*g/i,
  //     ),
  //     percentualFrutasLegumesOleaginosas: extrairValor(
  //       /% de frutas, legumes e oleaginosas.*?(\d+(?:,\d+)?(?:\s*-\s*\d+(?:,\d+)?)?)\s*%/i,
  //     ),
  //   };
  // }

  private obterDadosNutricionais(resposta: string): NutriScoreData {
    return {
      valorEnergetico: this.extrairValorFlexivel(resposta, {
        termosPrincipais: ['valor energético', 'energia'],
        termosSecundarios: ['kcal', 'caloria'],
        unidade: 'kcal',
        padroesAdicionais: [
          /aproximadamente\s*(\d+)\s*kcal/i,
          /em torno de\s*(\d+)\s*kcal/i,
        ],
      }),
      acucaresTotais: this.extrairValorFlexivel(resposta, {
        termosPrincipais: ['açúcares totais', 'conteúdo de açúcares'],
        termosSecundarios: ['açúcar'],
        unidade: 'g',
      }),
      gordurasSaturadas: this.extrairValorFlexivel(resposta, {
        termosPrincipais: ['gordura saturada', 'teor de gordura'],
        termosSecundarios: ['gordura', 'saturada'],
        unidade: 'g',
        padroesAdicionais: [
          /gordura saturada.*?em torno de\s*(\d+(?:,\d+)?)\s*g/i,
          /gordura saturada.*?aproximadamente\s*(\d+(?:,\d+)?)\s*g/i,
        ],
      }),
      sodio: this.extrairValorFlexivel(resposta, {
        termosPrincipais: ['teor de sódio', 'sódio'],
        termosSecundarios: ['sal'],
        unidade: 'mg',
      }),
      proteinas: this.extrairValorFlexivel(resposta, {
        termosPrincipais: ['proteínas', 'teor de proteínas'],
        unidade: 'g',
      }),
      fibrasAlimentares: this.extrairValorFlexivel(resposta, {
        termosPrincipais: ['fibras alimentares', 'fibras'],
        unidade: 'g',
      }),
      percentualFrutasLegumesOleaginosas: this.extrairValorFlexivel(resposta, {
        termosPrincipais: [
          'frutas, legumes e oleaginosas',
          'percentual de frutas',
        ],
        termosSecundarios: ['frutas', 'legumes', 'oleaginosas'],
        unidade: '%',
      }),
    };
  }

  private extrairValorFlexivel(
    resposta: string,
    configuracoes: {
      termosPrincipais: string[];
      termosSecundarios?: string[];
      unidade?: string;
      padroesAdicionais?: RegExp[];
    },
  ): number {
    const {
      termosPrincipais,
      termosSecundarios = [],
      unidade = 'g',
      padroesAdicionais = [],
    } = configuracoes;

    // Regex padrão baseada nos termos principais
    const regexPadrao = new RegExp(
      `(?:${termosPrincipais.join('|')}).*?` +
        `(\\d+(?:,\\d+)?(?:\\s*-\\s*\\d+(?:,\\d+)?)?)?\\s*${unidade}`,
      'i',
    );

    // Primeiro tenta os padrões adicionais
    for (const padraoAdicional of padroesAdicionais) {
      const matchAdicional = resposta.match(padraoAdicional);
      if (matchAdicional) {
        const valorAdicional = this.normalizarValor(matchAdicional[1]);
        if (valorAdicional !== null) return valorAdicional;
      }
    }

    // Depois tenta o padrão principal
    const match = resposta.match(regexPadrao);
    if (match) {
      const valor = this.normalizarValor(match[1]);

      // Se não encontrou, tenta termos secundários
      if (valor === null && termosSecundarios.length) {
        return this.extrairValorFlexivel(resposta, {
          termosPrincipais: termosSecundarios,
          unidade,
        });
      }

      return valor || 0;
    }

    // Se todos os métodos falharem, tenta uma busca contextual
    return this.extrairValorContextual(
      resposta,
      [...termosPrincipais, ...termosSecundarios],
      unidade,
    );
  }

  private normalizarValor(valorTexto?: string): number | null {
    if (!valorTexto) return null;

    const valores = valorTexto.split('-').map((v) =>
      parseFloat(
        v
          .trim()
          .replace(',', '.')
          .replace(/[^\d.]/g, ''),
      ),
    );

    const valorFinal = valores.length > 1 ? Math.max(...valores) : valores[0];
    return isNaN(valorFinal) ? null : valorFinal;
  }

  private extrairValorContextual(
    resposta: string,
    termos: string[],
    unidade: string,
  ): number {
    const linhas = resposta.split(/\n|\./).map((linha) => linha.toLowerCase());

    for (const termo of termos) {
      const linhaCorrespondente = linhas.find((linha) =>
        linha.includes(termo.toLowerCase()),
      );

      if (linhaCorrespondente) {
        const match = linhaCorrespondente.match(/(\d+(?:,\d+)?)/);
        if (match) {
          return parseFloat(match[1].replace(',', '.'));
        }
      }
    }

    return 0;
  }

  private calcularNutriScore(dados: NutriScoreData): string {
    const calcularPontos = (valor: number, ranges: number[][]): number =>
      ranges.findIndex((range) => valor <= range[0]) !== -1
        ? ranges.findIndex((range) => valor <= range[0])
        : ranges.length;

    const pontosNegativos = [
      calcularPontos(dados.valorEnergetico, this.nutrientRanges.energia),
      calcularPontos(dados.acucaresTotais, this.nutrientRanges.acucar),
      calcularPontos(
        dados.gordurasSaturadas,
        this.nutrientRanges.gordurasSaturadas,
      ),
      calcularPontos(dados.sodio, this.nutrientRanges.sodio),
    ].reduce((a, b) => a + b, 0);

    const pontosPositivos = [
      calcularPontos(dados.proteinas, this.nutrientRanges.proteinas),
      calcularPontos(dados.fibrasAlimentares, this.nutrientRanges.fibras),
      calcularPontos(
        dados.percentualFrutasLegumesOleaginosas,
        this.nutrientRanges.frutasLegumesOleaginosas,
      ),
    ].reduce((a, b) => a + b, 0);

    const pontuacaoFinal = pontosNegativos - pontosPositivos;

    return pontuacaoFinal <= -1
      ? 'A'
      : pontuacaoFinal <= 0
        ? 'B'
        : pontuacaoFinal <= 2
          ? 'C'
          : pontuacaoFinal <= 4
            ? 'D'
            : 'E';
  }

  private handleGeminiAPIError(error: any): never {
    this.logger.error('Erro na chamada da API Gemini', error);

    if (error.response) {
      throw new HttpException(
        error.response.data?.error || 'Erro na API Gemini',
        error.response.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    throw new HttpException(
      error.request ? 'Falha na comunicação' : 'Erro interno do servidor',
      error.request
        ? HttpStatus.SERVICE_UNAVAILABLE
        : HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
