import React, { useEffect, useState } from 'react';
import { render, useNetTableKey } from 'react-panorama-x';

function Counter() {
  const timeOprt = useNetTableKey("GamingTable", "timeOprt") ?? { time: 0 }


  return (
    <Panel style={{ flowChildren: 'down' }}>
      <Label className='Countdown' text={`Count: ${timeOprt.time ?? 0}`} />

      <TextButton className="ButtonBevel" text="Roll" onactivate={() => {
        GameEvents.SendCustomGameEventToServer("GM_Operator", {
          nPlayerID: Players.GetLocalPlayer(),
          typeOprt: 1
        })
      }} />

      <TextButton className="ButtonBevel" text="AYZZ" onactivate={() => {
        GameEvents.SendCustomGameEventToServer("GM_Operator", {
          nPlayerID: Players.GetLocalPlayer(),
          typeOprt: 2,
          nRequest: 1
        })
      }} />

      <TextButton className="ButtonBevel" text="Finish" onactivate={() => {
        GameEvents.SendCustomGameEventToServer("GM_Operator", {
          nPlayerID: Players.GetLocalPlayer(),
          typeOprt: 0
        })
      }} />

    </Panel>
  );
}



function setOprtCountdown(data: number) {

}

render(<Counter />, $.GetContextPanel());