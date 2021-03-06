import * as Msal from 'msal';
import jsCookie from 'js-cookie';

export default class Authentication {
  constructor() {
    const redirectUri = process.env.URL_REDIRECT;

    this.applicationConfig = {
      auth: {
        clientId: process.env.CLIENT_ID,
        authority: process.env.AUTHORITY,
        redirectUri: redirectUri
      },
      cache: {
        cacheLocation: 'localStorage',
        storeAuthStateInCookie: true
      }
    }

    this.applicationScope = {
      scopes: ['openid']
    }

    this.app = typeof window === 'undefined' ? null : new Msal.UserAgentApplication(this.applicationConfig)
    this.handleRedirect = typeof window === 'undefined' ? null : this.app.handleRedirectCallback((error, response) => {
      if(error) {
        console.log(error);
      } else {
        jsCookie.set('token', response.idToken.rawIdToken, { expires: 1 });
      }
  });
  }

  acquireTokenRedirect = () => {
    //Always start with acquireTokenSilent to obtain a token in the signed in user from cache
    this.app.acquireTokenSilent(this.applicationScope).then((tokenResponse) => {
      tokenResponse;
    }).catch((error) => {
        console.log(error);
        // Upon acquireTokenSilent failure (due to consent or interaction or login required ONLY)
        // Call acquireTokenRedirect
        if (requiresInteraction(error.errorCode)) {
            this.app.acquireTokenRedirect(this.applicationScope);
        }
    });
  }

  authRedirectCallBack = (error, response) => {
    if (error) {
      console.error(error);
    } else {
      console.log(`token type is: ${response.tokenType}`)
    }
  }

  requiresInteraction = (errorCode) => {
    if (!errorCode || !errorCode.length) {
        return false;
    }
    return errorCode === "consent_required" || errorCode === "interaction_required" || errorCode === "login_required";
  }

  login = () => {
    this.app.loginRedirect(this.applicationScope);

    
    // if(this.app.getAccount() && !this.app.isCallback(window.location.hash)) {
    //   this.app.acquireTokenRedirect();
    // }
  }

  logout = () => {
    this.app.logout();
  }
  
  getToken = () => {
    let cachedToken = this.app.getCachedToken(this.applicationScope);
    if(cachedToken) {
      return cachedToken.accessToken;
    } else {
      return this.app.acquireTokenSilent(this.applicationScope).then((tokenResponse) => {
        return tokenResponse.accessToken;
      }).catch((err) => {
          if (this.requiresInteraction(err.errorCode)) {
            this.app.acquireTokenRedirect(this.applicationScope);
          }
      }); 
    }
  }


  callMSGraphPost = (token, endpoint, body) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;
    headers.append('Authorization', bearer);
    headers.append('Content-Type','application/json');
    const options = {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(body)
    };

    return fetch(endpoint, options).then((response) => {
        return response.json().then((data) => {        
          return data;
        });  
    });
  }


  callMSGraphGet = (isBlob, token, endpoint) => {
    const headers = new Headers();
    const bearer = `Bearer ${token}`;
    headers.append('Authorization', bearer);
    const options = {
      method: 'GET',
      headers: headers
    };

    return fetch(endpoint, options).then((response) => {
      if (!isBlob) {
        return response.json().then((data) => {        
          return data;
        });  
      } else {
        let blob = new Blob([response.arrayBuffer()], { type: "image/jpeg" });
        const imageObj = URL.createObjectURL(blob);
        return imageObj;
      }
    });
  }


  acquireTokenOnBehalf = () => {
    fetch('https://login.microsoftonline.com/6ce5b98b-d71a-402e-83f3-1c277686f825/oauth2/v2.0/token', {
      body: `client_id=${process.env.CLIENT_ID}&scope=https%3A%2F%2Fgraph.microsoft.com%2F.default&client_secret=${process.env.CLIENT_SECRET}&grant_type=client_credentials`,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      method: 'POST'
    }).then((res) => {
      return res.text().then((data) => {
        console.log(data)
      })
    }).catch((err) => {
      console.log(err)
    })
  }

  getUser = () => {
    return this.app.getUser();
  }
}