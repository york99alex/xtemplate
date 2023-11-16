import 'panorama-polyfill-x/lib/console';
import 'panorama-polyfill-x/lib/timers';

import { useMemo, type FC } from 'react';
import { render } from 'react-panorama-x';
import { useXNetTableKey } from '../hooks/useXNetTable';
import { PathPanel } from './PathPanel/components/pathPanel';
import { CountDown } from './CountDown/components/countDown';
import { PrisonPanel } from './PathPanel/components/prisonPanel';

const Test: FC = () => {
    const data = useXNetTableKey(`test_table`, `test_key`, { data_1: `HelloWorld` });
    const string_data = data.data_1;
    return useMemo(() => <Label text={`${string_data}`} />, [string_data]);
};


render(
    <>
        <CountDown />
        <PathPanel />
        <PrisonPanel />
    </>
    , $.GetContextPanel())

console.log(`Hello, Qing Tian Ge!`)

GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_ACTION_MINIMAP, false)
GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_AGHANIMS_STATUS, false)
GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_INVENTORY_QUICKBUY, false)
GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_INVENTORY_COURIER, false)
// GameUI.SetDefaultUIEnabled(DotaDefaultUIElement_t.DOTA_DEFAULT_UI_TOP_BAR_SCORE, false)

