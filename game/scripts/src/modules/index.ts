import { CardManager } from '../card/cardmanager';
import { ItemManager } from '../item/itemmanager';
import { GameLoop } from '../mode/GameLoop';
import { HeroSelection } from '../mode/HeroSelection';
import { Bot } from '../mode/bot';
import { PathManager } from '../path/PathManager';
import { PlayerManager } from '../player/playermanager';
import { EventManager } from '../utils/eventmanager';
import { Debug } from './Debug';
import { GameConfig } from './GameConfig';
import { XNetTable } from './xnet-table';

declare global {
    interface CDOTAGameRules {
        // 声明所有的GameRules模块，这个主要是为了方便其他地方的引用（保证单例模式）
        XNetTable: XNetTable;
        EventManager: EventManager;
        GameLoop: GameLoop;
        PlayerManager: PlayerManager;
        PathManager: PathManager;
        HeroSelection: HeroSelection;
        GameConfig: GameConfig;
        CardManager: CardManager;
        ItemManager: ItemManager;
    }
}

/**
 * 这个方法会在game_mode实体生成之后调用，且仅调用一次
 * 因此在这里作为单例模式使用
 **/
export function ActivateModules() {
    print("[ActivateModules] start...游戏开始")
    if (GameRules.XNetTable == null) {
        print("[GameRules初始化...]")
        // 初始化所有的GameRules模块
        GameRules.XNetTable = new XNetTable();
        GameRules.GameConfig = new GameConfig();
        Bot.init()

        // 初始化测试模块xD
        new Debug();
    }
}
