import{n as i,F as e,an as d,N as l,A as n,d as o,j as t}from"./index.mlCxaiYE.js";const r=i(e).withConfig({componentId:"sc-1i2i6ep-0"})(["display:block;padding:22px 0;border-bottom:1px solid ",";",";&:last-child{border-bottom:0;}"],(i=>!1===i.$border?"transparent":d(.5,i.theme.divider)),l("tablet")`
    display: flex;
  `),a=i.div.withConfig({componentId:"sc-1i2i6ep-1"})(["display:flex;flex-direction:column;flex-basis:100%;flex:1;&:first-child{min-width:70%;}&:last-child{min-width:0;}",";"],l("tablet")`
    p {
      margin-bottom: 0;
    }
  `),s=i(n).withConfig({componentId:"sc-1i2i6ep-2"})(["margin-bottom:4px;"]),SettingRow=({visible:i,description:e,name:d,label:l,border:c,children:p})=>!1===i?null:o(r,{gap:32,$border:c,children:[o(a,{children:[t(s,{as:"h3",children:t("label",{htmlFor:d,children:l})}),e&&t(n,{as:"p",type:"secondary",children:e})]}),t(a,{children:p})]});export{SettingRow as S};
