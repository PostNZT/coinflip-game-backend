import { Module } from '@nestjs/common';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { GameController } from './game.controller';
import { WebSocketDocsController } from './websocket-docs.controller';
import { ProvablyFairService } from './provably-fair.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [GameController, WebSocketDocsController],
  providers: [GameService, GameGateway, ProvablyFairService],
})
export class GameModule {}