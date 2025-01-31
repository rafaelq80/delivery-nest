import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CategoriaModule } from "../categoria/categoria.module";
import { ProdutoController } from "./controllers/produto.controller";
import { Produto } from "./entities/produto.entity";
import { ProdutoService } from "./services/produto.service";
import { NutriScoreService } from "./services/nutriscore.service";
import { HttpModule } from "@nestjs/axios";
import { ConfigModule } from "@nestjs/config";

@Module({
    imports: [
        TypeOrmModule.forFeature([Produto]), 
        CategoriaModule,
        HttpModule.register({
            timeout: 10000,
            maxRedirects: 5,
        }),
        ConfigModule.forRoot({
            isGlobal: true,
        }),
    ],
    providers: [ProdutoService, NutriScoreService],
    controllers: [ProdutoController],
    exports: [TypeOrmModule]
})
export class ProdutoModule {}