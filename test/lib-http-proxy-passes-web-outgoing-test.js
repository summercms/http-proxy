import { setRedirectHostRewrite, setConnection, writeStatusCode, writeHeaders, attachOutgoingHeaders, removeChunked } from '../src/proxi/passes/web.outgoing.ts';
import expect from 'expect.js';

describe('src/proxi/passes/web.outgoing.ts', function () {
    describe('#setRedirectHostRewrite', function () {
        beforeEach(function () {
            this.req = {
                headers: {
                    host: 'ext-auto.com'
                }
            };
            this.proxyRes = {
                statusCode: 301,
                headers: {
                    location: 'http://backend.com/'
                }
            };
            this.options = {
                target: new URL('http://backend.com')
            };
        });

        context('rewrites location host with hostRewrite', function () {
            beforeEach(function () {
                this.options.hostRewrite = 'ext-manual.com';
            });
            [201, 301, 302, 307, 308].forEach(function (code) {
                it('on ' + code, function () {
                    this.proxyRes.statusCode = code;
                    setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                    expect(this.proxyRes.headers.location).to.eql('http://ext-manual.com/');
                });
            });

            it('not on 200', function () {
                this.proxyRes.statusCode = 200;
                setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                expect(this.proxyRes.headers.location).to.eql('http://backend.com/');
            });

            it('not when hostRewrite is unset', function () {
                delete this.options.hostRewrite;
                setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                expect(this.proxyRes.headers.location).to.eql('http://backend.com/');
            });

            it('takes precedence over autoRewrite', function () {
                this.options.autoRewrite = true;
                setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                expect(this.proxyRes.headers.location).to.eql('http://ext-manual.com/');
            });

            it('not when the redirected location does not match target host', function () {
                this.proxyRes.statusCode = 302;
                this.proxyRes.headers.location = 'http://some-other/';
                setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                expect(this.proxyRes.headers.location).to.eql('http://some-other/');
            });

            it('not when the redirected location does not match target port', function () {
                this.proxyRes.statusCode = 302;
                this.proxyRes.headers.location = 'http://backend.com:8080/';
                setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                expect(this.proxyRes.headers.location).to.eql('http://backend.com:8080/');
            });
        });

        context('rewrites location host with autoRewrite', function () {
            beforeEach(function () {
                this.options.autoRewrite = true;
            });
            [201, 301, 302, 307, 308].forEach(function (code) {
                it('on ' + code, function () {
                    this.proxyRes.statusCode = code;
                    setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                    expect(this.proxyRes.headers.location).to.eql('http://ext-auto.com/');
                });
            });

            it('not on 200', function () {
                this.proxyRes.statusCode = 200;
                setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                expect(this.proxyRes.headers.location).to.eql('http://backend.com/');
            });

            it('not when autoRewrite is unset', function () {
                delete this.options.autoRewrite;
                setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                expect(this.proxyRes.headers.location).to.eql('http://backend.com/');
            });

            it('not when the redirected location does not match target host', function () {
                this.proxyRes.statusCode = 302;
                this.proxyRes.headers.location = 'http://some-other/';
                setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                expect(this.proxyRes.headers.location).to.eql('http://some-other/');
            });

            it('not when the redirected location does not match target port', function () {
                this.proxyRes.statusCode = 302;
                this.proxyRes.headers.location = 'http://backend.com:8080/';
                setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                expect(this.proxyRes.headers.location).to.eql('http://backend.com:8080/');
            });
        });

        context('rewrites location protocol with protocolRewrite', function () {
            beforeEach(function () {
                this.options.protocolRewrite = 'https';
            });
            [201, 301, 302, 307, 308].forEach(function (code) {
                it('on ' + code, function () {
                    this.proxyRes.statusCode = code;
                    setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                    expect(this.proxyRes.headers.location).to.eql('https://backend.com/');
                });
            });

            it('not on 200', function () {
                this.proxyRes.statusCode = 200;
                setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                expect(this.proxyRes.headers.location).to.eql('http://backend.com/');
            });

            it('not when protocolRewrite is unset', function () {
                delete this.options.protocolRewrite;
                setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                expect(this.proxyRes.headers.location).to.eql('http://backend.com/');
            });

            it('works together with hostRewrite', function () {
                this.options.hostRewrite = 'ext-manual.com';
                setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                expect(this.proxyRes.headers.location).to.eql('https://ext-manual.com/');
            });

            it('works together with autoRewrite', function () {
                this.options.autoRewrite = true;
                setRedirectHostRewrite(this.req, {}, this.proxyRes, this.options);
                expect(this.proxyRes.headers.location).to.eql('https://ext-auto.com/');
            });
        });
    });

    describe('#setConnection', function () {
        it('set the right connection with 1.0 - `close`', function () {
            var proxyRes = { headers: {} };
            setConnection({
                httpVersion: '1.0',
                headers: {
                    connection: null
                }
            }, {}, proxyRes);

            expect(proxyRes.headers.connection).to.eql('close');
        });

        it('set the right connection with 1.0 - req.connection', function () {
            var proxyRes = { headers: {} };
            setConnection({
                httpVersion: '1.0',
                headers: {
                    connection: 'hey'
                }
            }, {}, proxyRes);

            expect(proxyRes.headers.connection).to.eql('hey');
        });

        it('set the right connection - req.connection', function () {
            var proxyRes = { headers: {} };
            setConnection({
                httpVersion: null,
                headers: {
                    connection: 'hola'
                }
            }, {}, proxyRes);

            expect(proxyRes.headers.connection).to.eql('hola');
        });

        it('set the right connection - `keep-alive`', function () {
            var proxyRes = { headers: {} };
            setConnection({
                httpVersion: null,
                headers: {
                    connection: null
                }
            }, {}, proxyRes);

            expect(proxyRes.headers.connection).to.eql('keep-alive');
        });

        it('don`t set connection with 2.0 if exist', function () {
            var proxyRes = { headers: {} };
            setConnection({
                httpVersion: '2.0',
                headers: {
                    connection: 'namstey'
                }
            }, {}, proxyRes);

            expect(proxyRes.headers.connection).to.eql(undefined);
        });

        it('don`t set connection with 2.0 if doesn`t exist', function () {
            var proxyRes = { headers: {} };
            setConnection({
                httpVersion: '2.0',
                headers: {}
            }, {}, proxyRes);

            expect(proxyRes.headers.connection).to.eql(undefined);
        })

    });

    describe('#writeStatusCode', function () {
        it('should write status code', function () {
            var res = {
                writeHead: function (n) {
                    expect(n).to.eql(200);
                }
            };

            writeStatusCode({}, res, { statusCode: 200 });
        });
    });

    describe('#writeHeaders', function () {
        beforeEach(function () {
            this.proxyRes = {
                headers: {
                    hey: 'hello',
                    how: 'are you?',
                    'set-cookie': [
                        'hello; domain=my.domain; path=/',
                        'there; domain=my.domain; path=/; secure'
                    ]
                }
            };
            this.rawProxyRes = {
                headers: {
                    hey: 'hello',
                    how: 'are you?',
                    'set-cookie': [
                        'hello; domain=my.domain; path=/',
                        'there; domain=my.domain; path=/'
                    ]
                },
                rawHeaders: [
                    'Hey', 'hello',
                    'How', 'are you?',
                    'Set-Cookie', 'hello; domain=my.domain; path=/',
                    'Set-Cookie', 'there; domain=my.domain; path=/'
                ]
            };
            this.res = {
                setHeader: function (k, v) {
                    // https://nodejs.org/api/http.html#http_message_headers
                    // Header names are lower-cased
                    this.headers[k.toLowerCase()] = v;
                },
                getHeader: function (k) {
                    return this.headers[k.toLowerCase()]
                },
                headers: {}
            };
        });

        it('writes headers', function () {
            var options = {};
            writeHeaders({}, this.res, this.proxyRes, options);

            expect(this.res.headers.hey).to.eql('hello');
            expect(this.res.headers.how).to.eql('are you?');

            expect(this.res.headers).to.have.key('set-cookie');
            expect(this.res.headers['set-cookie']).to.be.an(Array);
            expect(this.res.headers['set-cookie']).to.have.length(2);
        });

        it('writes raw headers', function () {
            var options = {};
            writeHeaders({}, this.res, this.rawProxyRes, options);

            expect(this.res.headers.hey).to.eql('hello');
            expect(this.res.headers.how).to.eql('are you?');

            expect(this.res.headers).to.have.key('set-cookie');
            expect(this.res.headers['set-cookie']).to.be.an(Array);
            expect(this.res.headers['set-cookie']).to.have.length(2);
        });

        it('rewrites path', function () {
            var options = {
                cookiePathRewrite: '/dummyPath'
            };

            writeHeaders({}, this.res, this.proxyRes, options);

            expect(this.res.headers['set-cookie'])
                .to.contain('hello; domain=my.domain; path=/dummyPath');
        });

        it('does not rewrite path', function () {
            var options = {};

            writeHeaders({}, this.res, this.proxyRes, options);

            expect(this.res.headers['set-cookie'])
                .to.contain('hello; domain=my.domain; path=/');
        });

        it('removes path', function () {
            var options = {
                cookiePathRewrite: ''
            };

            writeHeaders({}, this.res, this.proxyRes, options);

            expect(this.res.headers['set-cookie'])
                .to.contain('hello; domain=my.domain');
        });

        it('does not rewrite domain', function () {
            var options = {};

            writeHeaders({}, this.res, this.proxyRes, options);

            expect(this.res.headers['set-cookie'])
                .to.contain('hello; domain=my.domain; path=/');
        });

        it('rewrites domain', function () {
            var options = {
                cookieDomainRewrite: 'my.new.domain'
            };

            writeHeaders({}, this.res, this.proxyRes, options);

            expect(this.res.headers['set-cookie'])
                .to.contain('hello; domain=my.new.domain; path=/');
        });

        it('removes domain', function () {
            var options = {
                cookieDomainRewrite: ''
            };

            writeHeaders({}, this.res, this.proxyRes, options);

            expect(this.res.headers['set-cookie'])
                .to.contain('hello; path=/');
        });

        it('rewrites headers with advanced configuration', function () {
            var options = {
                cookieDomainRewrite: {
                    '*': '',
                    'my.old.domain': 'my.new.domain',
                    'my.special.domain': 'my.special.domain'
                }
            };
            this.proxyRes.headers['set-cookie'] = [
                'hello-on-my.domain; domain=my.domain; path=/',
                'hello-on-my.old.domain; domain=my.old.domain; path=/',
                'hello-on-my.special.domain; domain=my.special.domain; path=/'
            ];
            writeHeaders({}, this.res, this.proxyRes, options);

            expect(this.res.headers['set-cookie'])
                .to.contain('hello-on-my.domain; path=/');
            expect(this.res.headers['set-cookie'])
                .to.contain('hello-on-my.old.domain; domain=my.new.domain; path=/');
            expect(this.res.headers['set-cookie'])
                .to.contain('hello-on-my.special.domain; domain=my.special.domain; path=/');
        });

        it('rewrites raw headers with advanced configuration', function () {
            var options = {
                cookieDomainRewrite: {
                    '*': '',
                    'my.old.domain': 'my.new.domain',
                    'my.special.domain': 'my.special.domain'
                }
            };
            this.rawProxyRes.headers['set-cookie'] = [
                'hello-on-my.domain; domain=my.domain; path=/',
                'hello-on-my.old.domain; domain=my.old.domain; path=/',
                'hello-on-my.special.domain; domain=my.special.domain; path=/'
            ];
            this.rawProxyRes.rawHeaders = this.rawProxyRes.rawHeaders.concat([
                'Set-Cookie',
                'hello-on-my.domain; domain=my.domain; path=/',
                'Set-Cookie',
                'hello-on-my.old.domain; domain=my.old.domain; path=/',
                'Set-Cookie',
                'hello-on-my.special.domain; domain=my.special.domain; path=/'
            ]);
            writeHeaders({}, this.res, this.rawProxyRes, options);

            expect(this.res.headers['set-cookie'])
                .to.contain('hello-on-my.domain; path=/');
            expect(this.res.headers['set-cookie'])
                .to.contain('hello-on-my.old.domain; domain=my.new.domain; path=/');
            expect(this.res.headers['set-cookie'])
                .to.contain('hello-on-my.special.domain; domain=my.special.domain; path=/');
        });

        it('does not remove `secure` attribute by default', function () {
            var options = {};

            writeHeaders({}, this.res, this.proxyRes, options);

            expect(this.res.headers['set-cookie']).to.contain('there; domain=my.domain; path=/; secure');
        });

        it('removes `secure` attribute when cookieRemoveSecure true', function () {
            var options = {
                cookieRemoveSecure: true
            };

            writeHeaders({}, this.res, this.proxyRes, options);

            expect(this.res.headers['set-cookie']).to.contain('there; domain=my.domain; path=/');
        });

        it('appends set-cookies header to an existing one', function () {
            var options = {
                mergeCookies: true,
            };

            this.res.setHeader('set-cookie', ['hello; domain=my.domain; path=/']);

            writeHeaders({}, this.res, this.proxyRes, options);

            expect(this.res.headers['set-cookie']).to.be.an(Array);
            expect(this.res.headers['set-cookie']).to.have.length(3);
        });

        it('appends set-cookies header to an existing one (set-cookie is not an array)', function () {
            var options = {
                mergeCookies: true,
            };

            this.proxyRes.headers = Object.assign({}, this.proxyRes.headers, { 'set-cookie': 'hello1; domain=my.domain; path=/' });

            this.res.setHeader('set-cookie', 'hello; domain=my.domain; path=/');

            writeHeaders({}, this.res, this.proxyRes, options);

            expect(this.res.headers['set-cookie']).to.be.an(Array);
            expect(this.res.headers['set-cookie']).to.have.length(2);
        });
    });

    describe('#attachOutgoingHeaders', function () {
        var proxyRes = {
            headers: {
                hey: 'hello',
                how: 'are you?'
            }
        };

        var res = {
            setHeader: function (k, v) {
                this.headers[k] = v;
            },
            headers: {}
        };

        attachOutgoingHeaders({}, res, proxyRes, { outgoingHeaders: { billy: 'sally' } });

        expect(res.headers.hey).to.not.exist;
        expect(res.headers.how).to.not.exist;
        expect(res.headers.billy).to.eql('sally');
    });

    describe('#removeChunked', function () {
        var proxyRes = {
            headers: {
                'transfer-encoding': 'hello'
            }
        };

        removeChunked({ httpVersion: '1.0' }, {}, proxyRes);

        expect(proxyRes.headers['transfer-encoding']).to.eql(undefined);
    });

});
