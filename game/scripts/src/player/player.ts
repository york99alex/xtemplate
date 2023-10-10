import { GameMessage } from "../mode/gamemessage"
import { Constant } from "../mode/constant"
import { Path } from "../path/Path"
import { AHMC } from "../utils/amhc"
import { PathDomain } from "../path/pathdomain"
import { reloadable } from "../utils/tstl-utils"
import { CDOTA_BaseNPC_BZ } from "./CDOTA_BaseNPC_BZ"

@reloadable
export class Player {

    m_bRoundFinished: boolean = null			//  此轮中已结束回合
    m_bDisconnect: boolean = null		   //  断线
    m_bDie: boolean = null				  //  死亡
    m_bAbandon: boolean = null			  //  放弃
    m_bDeathClearing: boolean = null		//  亡国清算中
    m_tMuteTradePlayers: PlayerID[] = []	  //  交易屏蔽玩家id

    m_nPlayerID: PlayerID = null				//  玩家ID
    m_nUserID: number = null				//  userID
    m_nSteamID: number = null				//  SteamID
    m_nWageGold: number = null			 //  每次工资
    m_nGold: number = 0				   //  拥有的金币
    m_nSumGold: number = 0				//  总资产
    m_nPassCount: number = null			//  剩余要跳过的回合数
    m_nCDSub: number = null				//  冷却减缩固值
    m_nManaSub: number = null			  //  耗魔减缩固值
    m_nLastAtkPlayerID: number = null	  //  最后攻击我的玩家ID
    m_nKill: number = null				 //  击杀数
    m_nGCLD: number = null				 //  攻城数
    m_nDamageHero: number = null		   //  英雄伤害
    m_nDamageBZ: number = null			 //  兵卒伤害
    m_nGoldMax: number = null			  //  巅峰资产数
    m_nBuyItem: number = null			  //  可购装备数
    m_nRank: number = null				 //  游戏排名
    m_nOprtOrder: number = null			//  操作顺序,根据m_PlayersSort中的index
    m_nRollMove: number = null			 //  roll点移动的次数（判断入狱给阎刃卡牌）
    m_nMoveDir: number = null			  //  方向	1=正向 -1=逆向

    m_nPlayerState: number = GameMessage.PS_None			//  玩家状态
    m_typeBuyState: number = GameMessage.TBuyItem_None//  购物状态
    m_typeTeam: DotaTeam = null			  //  自定义队伍

    m_oCDataPlayer = null			//  官方CDOTAPlayer脚本
    m_eHero: CDOTA_BaseNPC_Hero = null					//  英雄单位

    m_pathCur: Path = null				//  当前英雄所在路径
    m_pathLast: Path = null				//  上次英雄停留路径
    m_pathPassLast: Path = null			//  上次英雄经过路径
    m_pathMoveStart: Path = null			//  上次移动起点路径


    m_tabMyPath: {
        [typePath: number]: PathDomain[]
    } = null				//  占领的路径<路径类型,路径{}>
    m_tabBz: CDOTA_BaseNPC_BZ[] = null					//  兵卒
    m_tabHasCard: number[] = null			//  手上的卡牌
    m_tabUseCard = null			//  已使用的卡牌
    m_tabDelCard = null			//  已移除的卡牌
    m_tCourier = null			  //  信使
    __init: boolean = false            // 
    m_bBattle: boolean = null
    m_bGCLD: boolean = null
    private _setState_Invis_onUsedAbltID: number


    constructor(nPlayerID: PlayerID) {
        print("new Player(),nPlayerID:", nPlayerID)
        this.m_nPlayerID = nPlayerID
        this.m_nSteamID = PlayerResource.GetSteamAccountID(this.m_nPlayerID)
        this.m_nCDSub = 0
        this.m_nManaSub = 0
        this.m_nWageGold = 0
        this.m_nGold = 0
        this.m_nSumGold = 0
        this.m_nGoldMax = 0
        this.m_nPassCount = 0
        this.m_nLastAtkPlayerID = -1
        this.m_nKill = 0
        this.m_nGCLD = 0
        this.m_nDamageHero = 0
        this.m_nDamageBZ = 0
        this.m_tabMyPath = []
        this.m_tabBz = []
        this.m_tabHasCard = []
        this.m_tabUseCard = []
        this.m_tabDelCard = []
        this.m_nPlayerState = GameMessage.PS_None
        this.m_nBuyItem = 0
        this.m_typeBuyState = GameMessage.TBuyItem_None
        this.m_bDie = false
        this.m_bAbandon = false
        this.m_typeTeam = Constant.CUSTOM_TEAM[nPlayerID]
        this.m_pathCur = null
        this.m_nRollMove = 0
        this.m_nMoveDir = 1
        this.m_tMuteTradePlayers = []
        this.m_eHero = null
        this.m_tCourier = []
        this.m_bBattle = false
        this.m_bGCLD = false

        PlayerResource.SetCustomTeamAssignment(nPlayerID, DotaTeam.GOODGUYS)
        this.registerEvent()

        // 同步玩家网表信息
        this.setNetTableInfo()

        let tabData = CustomNetTables.GetTableValue("GamingTable", "all_playerids")
        if (tabData == null) tabData = []
        tabData[this.m_nPlayerID] = this.m_nPlayerID
        CustomNetTables.SetTableValue("GamingTable", "all_playerids", tabData)
        DeepPrintTable(tabData)
    }

    /**注册触发事件 */
    registerEvent(): void {
        GameRules.EventManager.Register("Event_OnDamage", (event) => this.onEvent_OnDamage(event), this, -987654321)
        GameRules.EventManager.Register("Event_Atk", (event) => this.onEvent_Atk_bzHuiMo(event), this)
        GameRules.EventManager.Register("Event_PlayerRoundBegin", (event) => this.onEvent_PlayerRoundBegin(event), this)
        GameRules.EventManager.Register("Event_UpdateRound", () => this.onEvent_UpdateRound(), this)
        GameRules.EventManager.Register("Event_Move", (event) => this.onEvent_Move(event), this)
        GameRules.EventManager.Register("Event_PlayerDie", (event) => this.onEvent_PlayerDie(event), this)
        GameRules.EventManager.Register("Event_HeroManaChange", (event) => this.onEvent_HeroManaChange(event), this)
    }

    /**受伤 */
    onEvent_OnDamage(event) {
        if (event.bIgnore) return

        // 受伤者
        const oVictim = EntIndexToHScript(event.entindex_victim_const) as CDOTA_BaseNPC
        if (IsValidEntity(oVictim) && (oVictim == this.m_eHero || this.hasBZ(oVictim))) {
            event.bIgnore = true
            event.damage = math.ceil(event.damage)

            // 攻击者
            const oAttacker = EntIndexToHScript(event.entindex_attacker_const) as CDOTA_BaseNPC
            let oPlayerAtk: Player
            if (IsValidEntity(oAttacker)) {
                this.m_nLastAtkPlayerID = oAttacker.GetPlayerOwnerID()
                oPlayerAtk = GameRules.PlayerManager.getPlayer(oAttacker.GetPlayerOwnerID())
                // 统计伤害
                if (oPlayerAtk) {
                    if (oAttacker.IsHero()) {
                        oPlayerAtk.m_nDamageHero += event.damage
                    } else {
                        oPlayerAtk.m_nDamageBZ += event.damage
                    }
                }
            }

            if (event.damage > 0) {
                // 扣钱
                if (!event.bIgnoreGold) {
                    // 自身设置金币
                    if (!(oPlayerAtk == this && event.bIgnoreDamageSelf)) {
                        this.setGold(-event.damage)
                        GameRules.GameConfig.showGold(this, -event.damage)
                        GameRules.EventManager.FireEvent("Event_ChangeGold_Atk", {
                            player: this,
                            nGold: -event.damage
                        })
                    }

                    print("debug oPlayerAtk != self is ", oPlayerAtk != this)
                    print("debug oPlayerAtk", oAttacker.GetPlayerOwnerID())

                    // 攻击者是敌人，给敌人玩家设置金币
                    if (!event.bIgnoreAddGold
                        && oPlayerAtk
                        && oPlayerAtk != this) {
                        oPlayerAtk.setGold(event.damage)
                        GameRules.GameConfig.showGold(oPlayerAtk, event.damage)
                        GameRules.EventManager.FireEvent("Event_ChangeGold_Atk", {
                            player: oPlayerAtk,
                            nGold: event.damage
                        })
                    }
                }

                // 是否扣血
                if (oAttacker.GetClassname() == "npc_dota_creature") {
                    // 兵卒攻击不扣血
                    if (!oPlayerAtk.m_bGCLD) {
                        print("非攻城略地,兵卒攻击不扣血 damage = 0")
                        event.damage = 0
                    }
                }

                // 兵卒受伤回魔
                if (oVictim.GetClassname() == "npc_dota_creature"
                    && !event.bIgnoreBZHuiMo) {
                    // 计算回魔量
                    let nHuiMoRate = Constant.BZ_HUIMO_BEATK_RATE
                    let tabEventHuiMo = {
                        eBz: oVictim,
                        nHuiMoSum: event.damage * nHuiMoRate,
                        getBaseHuiMo: () => {
                            let nHuimoBase = event.damage * nHuiMoRate
                            return () => {
                                return nHuimoBase
                            }
                        }
                    }
                    // 触发兵卒回魔事件
                    GameRules.EventManager.FireEvent("Event_BZHuiMo", tabEventHuiMo)
                    if (tabEventHuiMo.nHuiMoSum > 0) {
                        // 给兵卒回魔
                        oVictim.GiveMana(tabEventHuiMo.nHuiMoSum)
                    }
                }

                // 扣血
                let nHealth = oVictim.GetHealth() - event.damage
                if (nHealth < 2) {
                    // 即将死亡,设置成1血
                    nHealth = 2
                }
                oVictim.ModifyHealth(nHealth, null, false, 0)
            }
            event.damage = 0
        }

    }

    onEvent_Atk_bzHuiMo(event) {

    }

    onEvent_PlayerRoundBegin(event) {

    }

    /**游戏回合更新 */
    onEvent_UpdateRound() {
        // 重置玩家回合结束的记录
        this.setRoundFinished(false)
        const nRound = GameRules.GameConfig.m_nRound
        if (nRound > 1) {
            // 加经验
            const nAddExp = 1 + math.floor(nRound / 10)
            this.setExpAdd(nAddExp)
        }
    }

    onEvent_Move(event) {

    }

    onEvent_PlayerDie(event) {

    }

    onEvent_HeroManaChange(event) {

    }

    sendMsg(strMgsID: string, tabData) {
        switch (strMgsID) {
            case "GM_Operator":
                CustomGameEventManager.Send_ServerToPlayer(this.m_oCDataPlayer, strMgsID, tabData)
                break;
            case "GM_OperatorFinished":
                CustomGameEventManager.Send_ServerToPlayer(this.m_oCDataPlayer, strMgsID, tabData)
                break;
            case "S2C_GM_HUDErrorMessage":
                CustomGameEventManager.Send_ServerToPlayer(this.m_oCDataPlayer, strMgsID, tabData)
                break;
            case "GM_CameraCtrl":
                CustomGameEventManager.Send_ServerToPlayer(this.m_oCDataPlayer, strMgsID, tabData)
                break;
            default:
                print("====player.sendMsg====!!!未匹配消息:", strMgsID, "!!!=========")
                break;
        }
    }

    /**全军查找物品 */
    getItemFromAllByName(itemName: string, itemIgnore) {
        let item = this.get09ItemByName(itemName, itemIgnore)
        if(item){
            return item
        }
        for (const v of this.m_tabBz) {
            item = v.get09ItemByName(itemName, itemIgnore)
            if (item) {
                return item
            }
        }
    }

    /**获取单位物品栏6格中的物品用名字 */
    get06ItemByName(sName: string, itemIgnore) {
        for (let i = 0; i < 6; i++) {
            const item = this.m_eHero.GetItemInSlot(i)
            if (item && item != itemIgnore && !item.IsNull() && item.GetAbilityName() == sName){
                return item
            }
        }
    }

    /**获取单位物品栏加背包9格中的物品用名字 */
    get09ItemByName(sName: string, itemIgnore) {
        if (IsValidEntity(this.m_eHero)) {
            for (let i = 0; i < 9; i++) {
                const item = this.m_eHero.GetItemInSlot(i)
                if (item && item != itemIgnore && !item.IsNull() && item.GetAbilityName() == sName){
                    return item
                }
            }
        }
    }


    /**设置断线 */
    setDisconnect(bVal: boolean) {
        const keyname = "player_info_" + this.m_nPlayerID as
            "player_info_0" | "player_info_1" | "player_info_2" | "player_info_3" | "player_info_4" | "player_info_5";
        // 设置网表
        const info = CustomNetTables.GetTableValue("GamingTable", keyname)
        info["bDisconnect"] = (bVal ? 1 : 0)
        CustomNetTables.SetTableValue("GamingTable", keyname, info)

        this.m_bDisconnect = bVal
        this.updateCtrl()
    }

    updateCtrl() {
        let nCtrlID: PlayerID
        if (this.m_bDisconnect) nCtrlID = -1
        else nCtrlID = this.m_nPlayerID
        if (this.m_eHero != null)
            this.m_eHero.SetControllableByPlayer(nCtrlID, true)
        for (const v of Object.values(this.m_tabBz)) {
            if (v != null)
                v.SetControllableByPlayer(nCtrlID, true)
        }
    }

    // 发送手牌数据给客户端
    sendHandCardData() {
        // let jsonData = []
        // for (const value of this.m_tabHasCard) {

        // }
    }

    initPlayer() {
        this.__init = true

        // 控制权
        Timers.CreateTimer(0.1, () => {
            this.m_eHero.SetControllableByPlayer(this.m_bDisconnect ? -1 : this.m_nPlayerID, true)
        })
        // 碰撞半径
        this.m_eHero.SetHullRadius(1)
        // 视野
        this.m_eHero.SetDayTimeVisionRange(300)
        this.m_eHero.SetNightTimeVisionRange(300)
        // 禁止攻击
        this.setHeroCanAttack(false)
        this.m_eHero.SetAttackCapability(UnitAttackCapability.NO_ATTACK)
        // 禁止自动寻找最短路径
        // this.m_eHero.SetMustReachEachGoalEntity(true)
        // 0升级点
        this.m_eHero.SetAbilityPoints(0)
        // 0回蓝
        Timers.CreateTimer(0.1, () => {
            this.m_eHero.SetMaxMana(1)
            this.m_eHero.SetBaseManaRegen(0)
            this.m_eHero.SetBaseManaRegen(-(this.m_eHero.GetManaRegen()))
        })
        // 0回血
        Timers.CreateTimer(0.1, () => {
            this.m_eHero.SetBaseHealthRegen(0)
            this.m_eHero.SetBaseHealthRegen(-(this.m_eHero.GetHealthRegen()))
        })
        // 初始化金币
        this.setGold(Constant.INITIAL_GOLD)
        this.setGoldUpdate()
        // 清空英雄物品
        for (let slot = 0; slot < 9; slot++) {
            const item = this.m_eHero.GetItemInSlot(slot)
            if (item != null)
                this.m_eHero.RemoveItem(item)
        }
        // 初始化技能
        for (let index = 0; index < 24; index++) {
            const oAblt = this.m_eHero.GetAbilityByIndex(index)
            if (oAblt != null)
                oAblt.SetLevel(1)
        }
        // 设置起点路径
        this.setPath(GameRules.PathManager.getPathByType(GameMessage.TP_START)[0])

    }

    initTeam() {
        this.m_typeTeam = PlayerResource.GetTeam(this.m_nPlayerID)
    }

    /**该玩家是否有该兵卒 */
    hasBZ(entity: CBaseEntity | EntityIndex): CBaseEntity {
        if (entity != null) {
            if (typeof entity != "number") {
                for (const v of this.m_tabBz) {
                    if (entity == v) {
                        return v
                    }
                }
            } else {
                for (const v of this.m_tabBz) {
                    if (IsValidEntity(v)) {
                        if (entity == v.GetEntityIndex()) {
                            return v
                        }
                    }
                }
            }
        }
    }

    setHeroCanAttack(bCan: boolean) {
        print("setHeroCanAttack:", bCan)
        if (bCan)
            AHMC.RemoveAbilityAndModifier(this.m_eHero, "jiaoxie")
        else
            AHMC.AddAbilityAndSetLevel(this.m_eHero, "jiaoxie")
    }

    /** 设置玩家网表信息 */
    setNetTableInfo() {
        const keyname = "player_info_" + this.m_nPlayerID as
            "player_info_0" | "player_info_1" | "player_info_2" | "player_info_3" | "player_info_4" | "player_info_5";
        const tabData = CustomNetTables.GetTableValue("GamingTable", keyname)
        // 拥有的路径信息
        let tabOwnPath: number[] = []
        for (const key in this.m_tabMyPath) {
            const paths = this.m_tabMyPath[key];
            for (const path of paths) {
                tabOwnPath.push(path.m_nID)
            }
        }
        // 有兵卒的路径信息
        let tabBzPath: number[] = []
        for (const typePath in this.m_tabMyPath) {
            const paths = this.m_tabMyPath[typePath];
            if (tonumber(typePath) >= GameMessage.TP_DOMAIN_1 && paths[0].m_tabENPC.length > 0) {
                tabBzPath.push(tonumber(typePath))
            }
        }
        // 设置网表
        CustomNetTables.SetTableValue("GamingTable", keyname, {
            bDisconnect: tabData == null ? 0 : tabData.bDisconnect,
            nGold: this.m_nGold,
            nSumGold: this.m_nSumGold,
            bRoundFinished: this.m_bRoundFinished ? 1 : 0,
            nPathCurID: tabData == null ? 1 : this.m_pathCur.m_nID,
            nSteamID64: tabData == null ? PlayerResource.GetSteamAccountID(this.m_nPlayerID) : tabData.nSteamID64,
            nSteamID32: tabData == null ? PlayerResource.GetSteamID(this.m_nPlayerID) : tabData.nSteamID32,
            tabPathHasBZ: tabBzPath,
            tabPath: tabOwnPath,
            nCard: this.m_tabHasCard.length,
            nCDSub: this.m_nCDSub,
            nManaSub: this.m_nManaSub,
            nKill: this.m_nKill,
            nGCLD: this.m_nGCLD,
            nBuyItem: this.m_nBuyItem,
            typeBuyState: this.m_typeBuyState,
            bDeathClearing: this.m_bDeathClearing ? 1 : 0,
            nOprtOrder: this.m_nOprtOrder,
            tMuteTradePlayers: this.m_tMuteTradePlayers,
            typeTeam: this.m_typeTeam
        })
        // DeepPrintTable(CustomNetTables.GetTableValue("GamingTable", keyname))
    }

    GetGold() {
        return this.m_nGold
    }

    /**
     * 设置金钱
     * @param nGold 
     */
    setGold(nGold: number) {
        const lastnGold = this.m_nGold
        nGold += this.m_nGold

        this.m_nGold = nGold
        const keyname = "player_info_" + this.m_nPlayerID as
            "player_info_0" | "player_info_1" | "player_info_2" | "player_info_3" | "player_info_4" | "player_info_5";
        // 设置网表
        const info = CustomNetTables.GetTableValue("GamingTable", keyname)
        if (info != null) info.nGold = this.m_nGold
        CustomNetTables.SetTableValue("GamingTable", keyname, info)
        // print("keyname", keyname)
        // print("=========DeepPrintTable:GamingTable", CustomNetTables.GetTableValue("GamingTable", keyname))
        // DeepPrintTable(CustomNetTables.GetTableValue("GamingTable", keyname))

        if ((lastnGold >= 0) != (nGold >= 0)) {
            CustomGameEventManager.Send_ServerToPlayer(this.m_oCDataPlayer, "Event_TO_SendDeathClearing", { nPlayerId: this.m_nPlayerID })
        }

        Timers.CreateTimer(0.1, () => {
            this.setSumGold()
        })
    }

    /**给其他玩家金钱 */
    giveGold(nGold: number, player: Player) {
        this.m_nLastAtkPlayerID = player.m_nPlayerID
        this.setGold(-nGold)
        player.setGold(nGold)
    }

    /** 设置总资产 */
    setSumGold() {
        this.m_nSumGold = this.m_nGold
        // 统计领地
        for (const index in this.m_tabMyPath) {
            this.m_nSumGold += (this.m_tabMyPath[index].length * (Constant.PATH_TO_PRICE[tonumber(index)]))
        }
        // 统计装备
        for (let slot = 0; slot < 9; slot++) {
            const item = this.m_eHero.GetItemInSlot(slot)
            if (item != null) {
                let nGoldCost = GetItemCost(item.GetAbilityName())
                this.m_nSumGold += nGoldCost
            }
        }
        // 统计兵卒
        if (this.m_tabBz.length > 0) {
            for (const value of this.m_tabBz) {
                if (!value.IsNull()) {
                    const ablt = value.FindAbilityByName("xj_" + value.m_path.m_typePath) as CDOTA_Ability_Lua
                    if (ablt != null) {
                        for (let index = ablt.GetLevel() - 1; index > -1; index--) {
                            const nGoldCost = ablt.GetGoldCost(index)
                            this.m_nSumGold += nGoldCost * -2
                        }
                    }
                }
            }
        }

        if (this.m_nGoldMax < this.m_nSumGold) this.m_nGoldMax = this.m_nSumGold

        // 设置网表
        const keyname = "player_info_" + this.m_nPlayerID as
            "player_info_0" | "player_info_1" | "player_info_2" | "player_info_3" | "player_info_4" | "player_info_5";
        const info = CustomNetTables.GetTableValue("GamingTable", keyname)
        info.nSumGold = this.m_nSumGold
        CustomNetTables.SetTableValue("GamingTable", keyname, info)
    }

    setGoldUpdate() {
        Timers.CreateTimer(() => {
            if (!AHMC.IsValid(this.m_eHero)) return
            if (this.m_nGold > 0)
                this.m_eHero.SetGold(this.m_nGold, false)
            else
                this.m_eHero.SetGold(0, false)
            this.m_eHero.SetGold(0, true)
            return 0.1
        })
    }

    /**
     * 设置当前路径
     * @param path 
     * @param bPass 经过某地
     */
    setPath(path: Path, bPass?: boolean) {
        if (bPass)
            // 经过某地
            this.m_pathPassLast = this.m_pathCur
        else {
            // 抵达目的地
            this.m_pathLast = this.m_pathMoveStart
            if (this.m_pathLast != null)
                this.m_pathLast.setEntityDel(this.m_eHero)
            if (path != null)
                // 加入
                path.setEntityAdd(this.m_eHero)
        }

        if (this.m_pathCur != path) {
            // 触发当前路径变更
            this.m_pathCur = path
            CustomGameEventManager.Send_ServerToPlayer(this.m_oCDataPlayer, "Event_CurPathChange", {
                playerID: this.m_nPlayerID
            })
        }
        this.m_pathCur = path

        if (!bPass || bPass == null) {
            CustomGameEventManager.Send_ServerToPlayer(this.m_oCDataPlayer, "Event_JoinPath", {
                playerID: this.m_nPlayerID
            })
        }

        // 同步玩家网表信息
        this.setNetTableInfo()
    }

    /**设置兵卒攻击状态 */
    setBzAttack(eBz, bCan?: boolean) {
        if (eBz == null) return
        if (bCan == null) {
            bCan = (this.m_nPlayerState & GameMessage.PS_AtkBZ) !== 0 && (this.m_nPlayerState & GameMessage.PS_InPrison) === 0
        }

        for (const value of this.m_tabBz) {
            if (value == eBz) {
                if (bCan) {
                    // 攻击时不能控制
                    value.SetControllableByPlayer(-1, true)
                    // 攻击时需要为敌方
                    value.SetTeam(DotaTeam.BADGUYS)
                    CustomGameEventManager.Send_ServerToPlayer(this.m_oCDataPlayer, "Event_BZCanAtk", { entity: value })
                } else {
                    AHMC.AddAbilityAndSetLevel(value, "jiaoxie")
                    if (!this.m_bDisconnect) value.SetControllableByPlayer(this.m_nPlayerID, true)
                    value.SetTeam(DotaTeam.GOODGUYS)
                    value.m_eAtkTarget = null
                    CustomGameEventManager.Send_ServerToPlayer(this.m_oCDataPlayer, "Event_BZCantAtk", { entity: value })
                }
                return
            }
        }
    }

    /**设置攻击目标给兵卒 */
    setBzAtker(eBz, eAtaker?: CDOTA_BaseNPC_Hero, bDel?: boolean) {
        if (eBz == null || this.m_tabBz.indexOf(eBz) == -1) return
        if (eBz.m_tabAtker == null) eBz.m_tabAtker = []

        if (bDel) {
            AHMC.removeAll(eBz.m_tabAtker, eAtaker)
        } else {
            if (eBz.m_tabAtker.indexOf(eAtaker) == -1) eBz.m_tabAtker.push(eAtaker)
            this.ctrlBzAtk(eBz)
        }
    }

    /**设置兵卒可否被攻击*/
    setBzBeAttack(eBz, bCan?: boolean) {
        if (eBz == null) return
        for (const value of this.m_tabBz) {
            if (value == eBz) {
                if (bCan)
                    AHMC.RemoveAbilityAndModifier(value, "physical_immune")
                else
                    AHMC.AddAbilityAndSetLevel(value, "physical_immune")
            }
            return
        }
    }

    /**兵卒攻击控制器 */
    ctrlBzAtk(eBz) {
        if (eBz == null) return
        if (eBz.IsInvisible()) return    //兵卒隐身不能攻击
        if (eBz._ctrlBzAtk_thinkID) return
        eBz._ctrlBzAtk_thinkID = Timers.CreateTimer(() => {
            if (eBz && !eBz.IsNull()) {
                // 获取在攻击范围的玩家
                for (const value of eBz.m_tabAtker) {
                    const nDis = (value.GetAbsOrigin() - eBz.GetAbsOrigin().Length())
                    const nRange = eBz.Script_GetAttackRange()
                    if (nDis <= nRange) {
                        // 达到攻击距离
                        if (AHMC.RemoveAbilityAndModifier(eBz, "jiaoxie")) {
                            eBz.SetDayTimeVisionRange(nRange)
                            eBz.SetNightTimeVisionRange(nRange)
                            eBz.MoveToTargetToAttack(value)
                            eBz.m_eAtkTarget = value
                            return 0.1
                        }
                    } else {
                        AHMC.AddAbilityAndSetLevel(eBz, "jiaoxie")
                        eBz.m_eAtkTarget = null
                    }
                    return 0.1
                }
            }
            eBz._ctrlBzAtk_thinkID = null
        })
    }

    /**移动到路径 */
    moveToPath(path: Path, funCallBack?: Function) {
        // 开始移动
        this.setPlayerState(GameMessage.PS_Moving)
        this.m_pathMoveStart = this.m_pathCur
        if (this.m_pathCur != path) {
            // 触发离开路径
            GameRules.EventManager.FireEvent("Event_LeavePath", { player: this, path: this.m_pathMoveStart })
        }
        // 监听移动经过路径
        const funPassingPath = (event: { path: Path, entity: CDOTA_BaseNPC }) => {
            if (event.entity == this.m_eHero) this.setPath(event.path, true)
        }
        GameRules.EventManager.Register("Event_PassingPath", funPassingPath)
        // 设置移动
        GameRules.PathManager.moveToPath(this.m_eHero, path, true, (bSuccess: boolean) => {
            GameRules.EventManager.UnRegister("Event_PassingPath", funPassingPath)
            this.setPlayerState(-GameMessage.PS_Moving)
            if (bSuccess && !this.m_bDie) {
                this.setPath(path)
            }
            if (funCallBack != null) funCallBack(bSuccess)
        })
    }

    /**设置玩家状态 */
    setPlayerState(playerState: number) {
        if (playerState > 0) {
            let newState = bit.bor(playerState, this.m_nPlayerState)
            playerState = newState - this.m_nPlayerState
            this.m_nPlayerState = newState
        } else {
            playerState = bit.band(-playerState, this.m_nPlayerState)
            this.m_nPlayerState -= playerState
        }

        // 判断是否有修改过以下状态
        if (bit.band(playerState, GameMessage.PS_AtkBZ) > 0) {
            // 设置兵卒可否攻击
            this.setAllBZAttack()
        }
        if (bit.band(playerState, GameMessage.PS_AtkHero) > 0) {
            // 设置英雄可否攻击
            let bCan: boolean = bit.band(this.m_nPlayerState, GameMessage.PS_AtkHero) > 0
            this.setHeroCanAttack(bCan)
            this.m_bBattle = bCan
            if (bCan) {
                // 攻击移除隐身状态
                this.setPlayerState(-GameMessage.PS_Invis)
            }

            // 计算卡牌可用状态
            this.setCardCanCast()
        }
        if (bit.band(playerState, GameMessage.PS_MagicImmune) > 0) {
            // 设置英雄魔免
            if (bit.band(this.m_nPlayerState, GameMessage.PS_MagicImmune) > 0) {
                AHMC.AddAbilityAndSetLevel(this.m_eHero, "magic_immune")
            } else {
                AHMC.RemoveAbilityAndModifier(this.m_eHero, "magic_immune")
            }
        }
        if (bit.band(playerState, GameMessage.PS_PhysicalImmune) > 0) {
            // 设置英雄物免
            if (bit.band(this.m_nPlayerState, GameMessage.PS_PhysicalImmune) > 0) {
                AHMC.AddAbilityAndSetLevel(this.m_eHero, "physical_immune")
            } else {
                AHMC.RemoveAbilityAndModifier(this.m_eHero, "physical_immune")
            }
        }
        if (bit.band(playerState, GameMessage.PS_Rooted) > 0) {
            // 设置英雄禁止移动
            if (bit.band(this.m_nPlayerState, GameMessage.PS_Rooted) > 0) {
                AHMC.AddAbilityAndSetLevel(this.m_eHero, "rooted")
            } else {
                AHMC.RemoveAbilityAndModifier(this.m_eHero, "rooted")

                // 触发事件:禁止移动取消
                GameRules.EventManager.FireEvent("Event_RootedDisable", { player: this })
            }
        }
        if (bit.band(playerState, GameMessage.PS_InPrison) > 0) {
            // 设置兵卒攻击状态
            this.setAllBZAttack()
            // 计算卡牌可用状态
            this.setCardCanCast()
        }
        if (bit.band(playerState, GameMessage.PS_Moving) > 0) {
            if (bit.band(this.m_nPlayerState, GameMessage.PS_Moving) > 0) {
                // 玩家开始移动
                GameRules.EventManager.FireEvent("Event_PlayerMove", { player: this })
            } else {
                // 玩家结束移动
                GameRules.EventManager.FireEvent("Event_PlayerMoveEnd", { player: this })
            }

            // 计算卡牌可用状态
            Timers.CreateTimer(() => {
                this.setCardCanCast()
            })
        }
        if (bit.band(playerState, GameMessage.PS_Pass) > 0) {
            if (bit.band(this.m_nPlayerState, GameMessage.PS_Pass) > 0) {
                GameRules.EventManager.FireEvent("Event_PlayerPass", { player: this })
            } else {
                GameRules.EventManager.FireEvent("Event_PlayerPassEnd", { player: this })
            }
        }
        if (bit.band(playerState, GameMessage.PS_Invis) > 0) {
            if (bit.band(this.m_nPlayerState, GameMessage.PS_Invis) > 0) {
                GameRules.EventManager.FireEvent("Event_PlayerInvis", { player: this })

                // 监听施法解除隐身
                this._setState_Invis_onUsedAbltID = GameRules.EventManager.Register("dota_player_used_ability", (event) => {
                    if (this.m_eHero != null && event.caster_entindex == this.m_eHero.GetEntityIndex()) {
                        this.setPlayerState(-GameMessage.PS_Invis)
                        return true
                    }
                })
            } else {
                GameRules.EventManager.FireEvent("Event_PlayerInvisEnd", { player: this })
                GameRules.EventManager.UnRegisterByID(this._setState_Invis_onUsedAbltID, "dota_player_used_ability")
                this._setState_Invis_onUsedAbltID = null
            }
        }

    }

    /**获取领地数量 */
    getPathCount() {
        let sum = 0
        for (const key in this.m_tabMyPath) {
            sum += this.m_tabMyPath[key].length
        }
        return sum
    }

    /**是否拥有路径 */
    isHasPath(nPathID: number): boolean {
        for (const key in this.m_tabMyPath) {
            const paths = this.m_tabMyPath[key];
            for (const path of paths) {
                if (path.m_nID == nPathID)
                    return true
            }
        }
        return false
    }

    /**添加占领路径 */
    setMyPathAdd(path) {
        print("path.m_nID", path.m_nID)

        if (this.m_bDie || this.isHasPath(path.m_nID)) {
            print("this.m_bDie", this.m_bDie)
            print("this.isHasPath(path.m_nID)", this.isHasPath(path.m_nID))
            print("路径已存在")
            return
        }

        this.m_tabMyPath[path.m_typePath] = this.m_tabMyPath[path.m_typePath] || [];
        this.m_tabMyPath[path.m_typePath].push(path);

        print("添加占领路径:", path.m_typePath)

        // 领地添加领主
        path.setOwner(this)

        // 计算总资产
        this.setSumGold()

        // 同步玩家网表信息
        this.setNetTableInfo()
    }

    /**移除兵卒 */
    removeBz(eBZ) {

    }

    /**创建兵卒到领地 */
    createBZOnPath(path: PathDomain, nStarLevel: number, bLevelUp?: boolean) {
        nStarLevel = nStarLevel ?? 1

        // 创建单位
        let strName = Constant.HERO_TO_BZ[this.m_eHero.GetUnitName()]
        for (let i = nStarLevel; i >= 2; i--) {
            strName += '1';
        }
        print("创建单位strName:", strName)

        const eBZ = AHMC.CreateUnit(strName, path.m_eCity.GetOrigin(), path.m_eCity.GetAnglesAsVector().y, this.m_eHero, DotaTeam.GOODGUYS) as CDOTA_BaseNPC_BZ
        eBZ.SetMaxHealth(eBZ.GetMaxHealth() + 500)
        eBZ.SetDayTimeVisionRange(300)
        eBZ.SetNightTimeVisionRange(300)
        // 添加数据
        this.m_tabBz.push(eBZ)
        path.m_tabENPC.push(eBZ);
        (eBZ as any).m_path = path as Path
        (eBZ as any).m_bBZ = true as boolean

        // 设置兵卒技能等级
        (eBZ as any).m_bAbltBZ = eBZ.GetAbilityByIndex(0)
        // 设置技能
        if (nStarLevel >= Constant.BZ_MAX_LEVEL) {
            // 设置巅峰技能
            AHMC.AddAbilityAndSetLevel(eBZ, "yjxr_max", Constant.BZ_MAX_LEVEL)
            eBZ.SwapAbilities((eBZ as any).m_bAbltBZ.GetAbilityName(), "yjxr_max", true, true)
        } else {
            AHMC.AddAbilityAndSetLevel(eBZ, "yjxr_" + path.m_typePath, nStarLevel)
            eBZ.SwapAbilities((eBZ as any).m_bAbltBZ.GetAbilityName(), "yjxr_" + path.m_typePath, true, true)
        }
        if (nStarLevel != 1) {
            AHMC.AddAbilityAndSetLevel(eBZ, "xj_" + path.m_typePath, nStarLevel)
            const oAblt = eBZ.GetAbilityByIndex(1)
            if (oAblt) {
                eBZ.SwapAbilities((eBZ as any).m_bAbltBZ.GetAbilityName(), "xj_" + path.m_typePath, !oAblt.IsHidden(), true)
            }
        }

        // 重置蓝量
        eBZ.SetMana(0)

        // 添加星星特效
        // AMHC.ShowStarsOnUnit(eBZ, nStarLevel)

        // 设置可否攻击
        this.setAllBZAttack()
        // 设置可否被攻击
        this.setAllBeBZAttack(eBZ, false)

        // 触发事件
        GameRules.EventManager.FireEvent("Event_BZCreate", { entity: eBZ })

        this.setBzLevelUp(eBZ)

        // 同步玩家网表信息
        this.setNetTableInfo()

        // 同步装备
        // this.m_eHero.syncItem(eBZ)
        // 设置共享
        // ItemShare.setShareAdd(eBZ, this.m_eHero)


        // 特效
    }

    /**设置玩家全部兵卒可否攻击 */
    setAllBZAttack() {
        const bCan = bit.band(this.m_nPlayerState, GameMessage.PS_AtkBZ) > 0
            && bit.band(this.m_nPlayerState, GameMessage.PS_InPrison) == 0

        function filter(eBZ) {
            return !eBZ.m_bBattle   // 忽略战斗中的兵卒
        }

        if (bCan) {
            for (const v of this.m_tabBz as CDOTA_BaseNPC[]) {
                if (IsValidEntity(v) && filter(v)) {
                    v.SetControllableByPlayer(-1, true)  // 攻击时不能控制
                    v.SetTeam(DotaTeam.BADGUYS) // 攻击时需要为敌方
                    GameRules.EventManager.FireEvent("Event_BZCanAtk", { eBZ: v })  // 触发兵卒可攻击事件
                }
            }
        } else {
            for (const v of this.m_tabBz) {
                if (IsValidEntity(v) && filter(v)) {
                    AHMC.AddAbilityAndSetLevel(v, "jiaoxie")
                    if (!this.m_bDisconnect) {
                        v.SetControllableByPlayer(this.m_nPlayerID, true)
                        v.SetTeam(DotaTeam.GOODGUYS)
                        v.m_eAtkTarget = null
                        GameRules.EventManager.FireEvent("Event_BZCantAtk", { eBZ: v })  //触发兵卒不可攻击事件
                    }
                }
            }
        }
    }

    /**设置兵卒可否被攻击 */
    setAllBeBZAttack(eBZ: CDOTA_BaseNPC, bCanBeAtk: boolean) {

    }

    /**更新兵卒等级 */
    setBzLevelUp(eBZ: CDOTA_BaseNPC) {
        if (eBZ.IsNull()) return

        // 获取要升级的等级
        let nLevel = Constant.BZ_LEVELMAX[this.getBzStarLevel(eBZ)]
        if (this.m_eHero.GetLevel() < nLevel) {
            nLevel = this.m_eHero.GetLevel()
        }
        nLevel -= eBZ.GetLevel()

        GameRules.EventManager.FireEvent("Event_BZLevelUp", { eBZ: eBZ, nLevel: nLevel })

        const bLevelDown = nLevel < 0

        // 升级特效

        // 等级变更

    }

    /**获取兵卒的星级 */
    getBzStarLevel(eBZ: CDOTA_BaseNPC) {
        if (eBZ.IsNull()) return

        let strName: string = eBZ.GetUnitName()
        strName = string.reverse(strName)
        print("string.reverse(strName):", strName)
        const nLevel = strName.indexOf('_')
        if (nLevel != -1) {
            return nLevel - 1
        } else {
            return 0
        }
    }


    /**设置购物状态 */
    setBuyState(typeState, nCount: number) {
        this.m_nBuyItem = nCount
        this.m_typeBuyState = typeState
        // 可购物事件
        GameRules.EventManager.FireEvent("Event_BuyState", { nCount: nCount, typeState: typeState, player: this })

        // 设置网表
        const keyname = "player_info_" + this.m_nPlayerID as
            "player_info_0" | "player_info_1" | "player_info_2" | "player_info_3" | "player_info_4" | "player_info_5";
        // 设置网标
        const info = CustomNetTables.GetTableValue("GamingTable", keyname)
        info["nBuyItem"] = this.m_nBuyItem
        info["typeBuyState"] = this.m_typeBuyState
        CustomNetTables.SetTableValue("GamingTable", keyname, info)
    }

    /**设置玩家自己回合结束 */
    setRoundFinished(bVal) {
        this.m_bRoundFinished = bVal
        if (this.m_bRoundFinished) {
            // 触发玩家回合结束事件
            GameRules.EventManager.FireEvent("Event_PlayerRoundFinished", this)
        }
        // 同步玩家网表信息
        this.setNetTableInfo()
    }

    /**增加经验 */
    setExpAdd(nVal: number) {
        const nAddExp = nVal
        const nCurExp = this.m_eHero.GetCurrentXP()
        const nLevelUpExp = Constant.LEVEL_EXP[this.m_eHero.GetLevel() + 1]
        this.m_eHero.AddExperience(nAddExp, 0, false, false)

        if (nLevelUpExp && nCurExp + nAddExp >= nLevelUpExp) {
            // 升级,触发属性变更
            GameRules.EventManager.FireEvent("Event_SxChange", { entity: this.m_eHero })
            // 修改回蓝回血为0
            Timers.CreateTimer(0.1, () => {
                this.updateRegen0()
            })
            // 整化魔法数值
            Timers.CreateTimer(0.05, () => {
                this.m_eHero.SetMana(math.floor(this.m_eHero.GetMana() + 0.5))
            })
            // 清空技能点
            this.m_eHero.SetAbilityPoints(0)
            // 设置技能等级
            const nLevel = math.floor(this.m_eHero.GetLevel() * 0.1) + 1
            this.m_eHero.GetAbilityByIndex(0).SetLevel(nLevel)
            this.m_eHero.GetAbilityByIndex(1).SetLevel(nLevel)

            // 更新全部兵卒等级
            this.m_tabBz.forEach(eBZ => {
                this.setBzLevelUp(eBZ)
            })
        }
    }

    updateRegen0() {
        this.m_eHero.SetBaseManaRegen(0)
        this.m_eHero.SetBaseManaRegen(-(this.m_eHero.GetManaRegen()))
        this.m_eHero.SetBaseHealthRegen(0)
        this.m_eHero.SetBaseHealthRegen(-(this.m_eHero.GetHealthRegen()))
    }


    // =============卡牌================

    /**设置可用卡牌 */
    setCardCanCast() {
        //TODO:
    }
}