import { useEffect, useRef, useState } from 'react';
import { useGameEvent, useNetTableKey } from 'react-panorama-x';
import { PlayerPanel } from './playerPanel';
import { SupplyItem } from './supplyItem';
import { TypeOprt } from '../../mode/constant';

export function SupplyPanel() {
    const root = useRef<Panel>(null);
    const supplyData = useNetTableKey('GamingTable', 'supply');
    const [oprtID, setOprtID] = useState(-1);
    const [playerList, setPlayerList] = useState<PlayerID[]>([]);
    const [supplyList, setSupplyList] = useState<any[]>([]);
    const [leftList, setLeftList] = useState<PlayerID[]>([]);
    const [rightList, setRightList] = useState<PlayerID[]>([]);
    const [selectData, setSelectData] = useState<any>({});

    // supply有data就始终打开面板
    useEffect(() => {
        console.log('===SupplyPanle useEffect supplyData:', supplyData);
        if (!supplyData) {
            root.current?.AddClass('Hidden');
            setPlayerList([]);
            return;
        } else root.current?.RemoveClass('Hidden');
        const tList: PlayerID[] = Object.values(supplyData.tabPlayerID);
        if (playerList.length != tList.length && tList.every((value, index) => value != playerList[index])) setPlayerList(tList);
        setSupplyList(Object.values(supplyData.tabSupplyInfo));
        setOprtID(supplyData.nPlayerIDOprt);
        // setPlayerList([0, 1, 1, 0, 0, 1]);
        // setSupplyList([
        //     { itemName: 'item_rapier', type: 'item' },
        //     { itemName: 'item_rapier', type: 'item' },
        //     { pathID: '3', type: 'path' },
        // ]);
    }, [supplyData]);

    // 左右两侧playerList分列
    useEffect(() => {
        for (let i = 0; i < playerList.length; i++) {
            if (i % 2 == 0) {
                setLeftList(prevList => [...prevList, playerList[i]]);
            } else {
                setRightList(prevList => [...prevList, playerList[i]]);
            }
        }
    }, [playerList]);

    useEffect(() => {
        // console.log('===SupplyPanle playerList:', playerList);
        // console.log('===SupplyPanle leftList:', leftList);
        // console.log('===SupplyPanle rightList:', rightList);
        // console.log('===SupplyPanle supplyList:', supplyList);
    });

    function getTipLabel(oprtID: number) {
        switch (oprtID) {
            case -1:
                return $.Localize('#supply_tip_ready');
            case -2:
                return $.Localize('#supply_tip_end');
            default:
                return $.Localize('#supply_tip_turn');
        }
    }

    useGameEvent('GM_Operator', event => {
        if (event.typeOprt == TypeOprt.TO_Supply) {
            console.log('===Supply GM_Operator event:', event);
        }
    });

    useGameEvent('GM_OperatorFinished', event => {
        if (event.typeOprt == TypeOprt.TO_Supply) {
            console.log('===Supply GM_OperatorFinished event:', event);
        }
    });

    return (
        <Panel className="SupplyRoot Hidden" ref={root} hittest={true}>
            <Panel className="Title">
                <Label className="TitleLabel" text={$.Localize('#supply_title')} />
                <Label className="TipLabel" text={getTipLabel(oprtID)} />
            </Panel>
            <Panel className="SupplyContain">
                <Panel className="PlayerGrid Left">
                    {leftList.map((playerID, index) => (
                        <PlayerPanel key={index} playerID={playerID} data={selectData} oprtID={oprtID} />
                    ))}
                </Panel>
                <Panel className="CenterContain">
                    {supplyList.map((supplyData, index) => (
                        <SupplyItem data={supplyData} key={index} index={index} />
                    ))}
                </Panel>
                <Panel className="PlayerGrid Right">
                    {rightList.map((playerID, index) => (
                        <PlayerPanel key={index} playerID={playerID} data={selectData} oprtID={oprtID} />
                    ))}
                </Panel>
            </Panel>
        </Panel>
    );
}
