import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeleteResult, In, LessThanOrEqual, Like, MoreThanOrEqual, Repository } from 'typeorm';
import { CategoriaService } from '../../categoria/services/categoria.service';
import { Produto } from '../entities/produto.entity';
import { NutriScoreService } from './nutriscore.service';

@Injectable()
export class ProdutoService {
  constructor(
    @InjectRepository(Produto)
    private produtoRepository: Repository<Produto>,
    private categoriaService: CategoriaService,
    private nutriscoreService: NutriScoreService,
  ) {}

  async findAll(): Promise<Produto[]> {
    return await this.produtoRepository.find({
      relations: {
        categoria: true,
        usuario: true,
      },
    });
  }

  async findById(id: number): Promise<Produto> {
    let produto = await this.produtoRepository.findOne({
      where: {
        id,
      },
      relations: {
        categoria: true,
        usuario: true,
      },
    });

    if (!produto)
      throw new HttpException(
        'O Produto não foi encontrado!',
        HttpStatus.NOT_FOUND,
      );

    return produto;
  }

  async findByNome(nome: string): Promise<Produto[]> {
    return await this.produtoRepository.find({
      where: {
        nome: Like(`%${nome}%`),
      },
      relations: {
        categoria: true,
        usuario: true,
      },
    });
  }

  async create(produto: Produto): Promise<Produto> {
    if (!produto.categoria)
      throw new HttpException(
        'Os dados da Categoria não foram informados!',
        HttpStatus.BAD_REQUEST,
      );

    await this.categoriaService.findById(produto.categoria.id);

    const nutriscore = await this.nutriscoreService.pesquisarNutriScore(produto.nome);

    produto.nutriscore = nutriscore;

    return await this.produtoRepository.save(produto);
  }

  async update(produto: Produto): Promise<Produto> {
    if (!produto.id)
      throw new HttpException(
        'O Produto não foi encontrado!',
        HttpStatus.NOT_FOUND,
      );

    await this.findById(produto.id);

    if (!produto.categoria)
      throw new HttpException(
        'Os dados da Categoria não foram informados!',
        HttpStatus.BAD_REQUEST,
      );

    await this.categoriaService.findById(produto.categoria.id);

    const nutriscore = await this.nutriscoreService.pesquisarNutriScore(produto.nome);

    produto.nutriscore = nutriscore;

    return await this.produtoRepository.save(produto);
  }

  async delete(id: number): Promise<DeleteResult> {
    await this.findById(id);

    return await this.produtoRepository.delete(id);
  }

  async findSaudavel(): Promise<Produto[]> {

    return await this.produtoRepository.find({
      where: {
       nutriscore: In(['A', 'B']),
      },
      relations: {
        categoria: true,
        usuario: true
      }
    });
  }
}
