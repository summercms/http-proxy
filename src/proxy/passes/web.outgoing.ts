import * as common from '../common';

const redirectRegex = /^201|30(1|2|7|8)$/;

/**
 * If is a HTTP 1.0 request, remove chunk headers
 *
 * @param { ClientRequest } req Request object
 * @param { IncomingMessage } res Response object
 * @param { proxyResponse } proxyRes Response object from the proxy request
 *
 * @api private
 */
export function removeChunked(req, res, proxyRes) {
    if (req.httpVersion === '1.0' || proxyRes.statusCode === 204 || proxyRes.statusCode === 304) {
        delete proxyRes.headers['transfer-encoding'];
    }
}

/**
 * If is a HTTP 1.0 request, set the correct connection header
 * or if connection header not present, then use `keep-alive`
 *
 * @param { ClientRequest } req Request object
 * @param { IncomingMessage } res Response object
 * @param { proxyResponse } proxyRes Response object from the proxy request
 *
 * @api private
 */
export function setConnection(req, res, proxyRes) {
    if (req.httpVersion === '1.0') {
        proxyRes.headers.connection = req.headers.connection || 'close';
    } else if (req.httpVersion !== '2.0' && !proxyRes.headers.connection) {
        proxyRes.headers.connection = req.headers.connection || 'keep-alive';
    }
}

/**
 * Set the headers from the proxyResponse
 * 
 * @param { ClientRequest } req Request object
 * @param { IncomingMessage } res Response object
 * @param { proxyResponse } proxyRes Response object from the proxy request
 * @param { Object } options Config object passed to the proxy
 * @api private
 */
export function setRedirectHostRewrite(req, res, proxyRes, options) {
    if ((options.hostRewrite || options.autoRewrite || options.protocolRewrite) && proxyRes.headers['location'] && redirectRegex.test(proxyRes.statusCode)) {

        const targetStr = typeof options.target === 'string' ? options.target : options.target.href;
        let target = new URL(targetStr);

        const u = new URL(proxyRes.headers['location']);
        // make sure the redirected host matches the target host before rewriting
        if (target.host != u.host) {
            return;
        }

        if (options.hostRewrite) {
            u.host = options.hostRewrite;
        } else if (options.autoRewrite) {
            u.host = req.headers['host'];
        }

        if (options.protocolRewrite) {
            u.protocol = options.protocolRewrite;
        }

        proxyRes.headers['location'] = u.toString()
    }
}

/**
 * Copy headers from proxyResponse to response
 * set each header in response object.
 *
 * @param { ClientRequest } req Request object
 * @param { IncomingMessage } res Response object
 * @param { proxyResponse } proxyRes Response object from the proxy request
 * @param { Object } options options.cookieDomainRewrite: Config to rewrite cookie domain
 *
 * @api private
 */
export function writeHeaders(req, res, proxyRes, options) {
    const preserveHeaderKeyCase = options.preserveHeaderKeyCase;

    let rewriteCookieDomainConfig = options.cookieDomainRewrite,
        rewriteCookiePathConfig = options.cookiePathRewrite,
        mergeCookiesConfig = options.mergeCookies,
        cookieRemoveSecure = options.cookieRemoveSecure,
        rawHeaderKeyMap;

        const setHeader = function (key, header) {
            if (rewriteCookieDomainConfig && key.toLowerCase() === 'set-cookie') {
                header = common.rewriteCookieProperty(header, rewriteCookieDomainConfig, 'domain');
            }
            if (rewriteCookiePathConfig && key.toLowerCase() === 'set-cookie') {
                header = common.rewriteCookieProperty(header, rewriteCookiePathConfig, 'path');
            }
            if (mergeCookiesConfig && key.toLowerCase() === 'set-cookie') {
                header = common.mergeSetCookie(res.getHeader('set-cookie'), header)
            }
            if (cookieRemoveSecure && key.toLowerCase() === 'set-cookie') {
                header = common.removeCookieProperty(header, 'secure');
            }

            try {
                res.setHeader(String(key).trim(), header);
            } catch (error) {
                console.warn(error, key, header);
            }
        };

    if (typeof rewriteCookieDomainConfig === 'string') { //also test for ''
        rewriteCookieDomainConfig = { '*': rewriteCookieDomainConfig };
    }

    if (typeof rewriteCookiePathConfig === 'string') { //also test for ''
        rewriteCookiePathConfig = { '*': rewriteCookiePathConfig };
    }

    // message.rawHeaders is added in: v0.11.6
    // https://nodejs.org/api/http.html#http_message_rawheaders
    if (preserveHeaderKeyCase && proxyRes.rawHeaders != undefined) {
        rawHeaderKeyMap = {};
        for (let i = 0; i < proxyRes.rawHeaders.length; i += 2) {
            let key = proxyRes.rawHeaders[i];
            rawHeaderKeyMap[key.toLowerCase()] = key;
        }
    }

    Object.keys(proxyRes.headers).forEach(function (key) {
        const header = proxyRes.headers[key];
        if (preserveHeaderKeyCase && rawHeaderKeyMap) {
            key = rawHeaderKeyMap[key] || key;
        }
        setHeader(key, header);
    });
}

/**
 * Add headers from options.outgoingHeaders to response
 *
 * @param { ClientRequest } req Request object
 * @param { IncomingMessage } res Response object
 * @param { proxyResponse } res Response object from the proxy request
 * @param { Object } options Object with options in it
 */
export function attachOutgoingHeaders(req, res, proxyRes, options) {
    if (options.outgoingHeaders != null) {
        Object.keys(options.outgoingHeaders).forEach(function (header) {
            res.setHeader(header, options.outgoingHeaders[header]);
        });
    }
}

/**
 * Set the statusCode from the proxyResponse
 *
 * @param { ClientRequest } req Request object
 * @param { IncomingMessage } res Response object
 * @param { proxyResponse } proxyRes Response object from the proxy request
 *
 * @api private
 */
export function writeStatusCode(req, res, proxyRes) {
    // From Node.js docs: response.writeHead(statusCode[, statusMessage][, headers])
    if (proxyRes.statusMessage) {
        res.statusCode = proxyRes.statusCode;
        res.statusMessage = proxyRes.statusMessage;
    } else {
        res.statusCode = proxyRes.statusCode;
    }
}

export const webOutgoing = {
    removeChunked: removeChunked,
    setConnection: setConnection,
    setRedirectHostRewrite: setRedirectHostRewrite,
    writeHeaders: writeHeaders,
    attachOutgoingHeaders: attachOutgoingHeaders,
    writeStatusCode: writeStatusCode
}