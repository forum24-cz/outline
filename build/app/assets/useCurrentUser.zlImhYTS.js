import{u as r,x as e}from"./index.mlCxaiYE.js";function useCurrentUser({rejectOnEmpty:u=!0}={}){const{auth:s}=r();return u&&e(s.user,"user required"),s.user||void 0}export{useCurrentUser as u};
