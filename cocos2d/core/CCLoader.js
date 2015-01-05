/****************************************************************************
 Copyright (c) 2010-2012 cocos2d-x.org
 Copyright (c) 2008-2010 Ricardo Quesada
 Copyright (c) 2011      Zynga Inc.

 http://www.cocos2d-x.org

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

/**
 * resource type
 * @constant
 * @type Object
 */
cc.RESOURCE_TYPE = {
    "IMAGE": ["png", "jpg", "bmp","jpeg","gif"],
    "SOUND": ["mp3", "ogg", "wav", "mp4", "m4a", "aif", "aiff"],
    "XML": ["plist", "xml", "fnt", "tmx", "tsx"],
    "BINARY": ["ccbi"],
    "FONT": "FONT",
    "TEXT":["txt", "vsh", "fsh","json", "ExportJson"],
    "UNKNOW": []
};

/**
 * A class to pre-load resources before engine start game main loop.
 * @class
 * @extends cc.Scene
 */
cc.Loader = cc.Class.extend(/** @lends cc.Loader# */{
    _curNumber: 0,
    _totalNumber: 0,
    _loadedNumber: 0,
    _resouces: null,
    _resourceMap: null, //LUMOS - this is so that we can see if a file exists
    _animationInterval: 1 / 60,
    _interval: null,
    _isAsync: false,

    /**
     * Constructor
     */
    ctor: function () {
        this._resouces = [];
        this._resourceMap = {};
    },

    /**
     * init with resources
     * @param {Array} resources
     * @param {Function|String} selector
     * @param {Object} target
     */
    initWithResources: function (resources, selector, target) {
        if(!resources){
            console.log("resources should not null");
            return;
        }

        if (selector) {
            this._selector = selector;
            this._target = target;
        }

        if ((resources != this._resouces) || (this._curNumber == 0)) {
            this._curNumber = 0;
            this._loadedNumber = 0;
            if (resources[0] instanceof Array) {
                for (var i = 0; i < resources.length; i++) {
                    var each = resources[i];
                    this._resouces = this._resouces.concat(each);
                }
            } else
                this._resouces = resources;
            this._totalNumber = this._resouces.length;
        }

        //load resources
        this._schedulePreload();
    },

    setAsync: function (isAsync) {
        this._isAsync = isAsync;
    },

    /**
     * Callback when a resource file load failed.
     * @example
     * //example
     * cc.Loader.getInstance().onResLoaded();
     */
    onResLoadingErr: function (name) {
        this._loadedNumber++;
        cc.log("cocos2d:Failed loading resource: " + name);
    },

    /**
     * Callback when a resource file loaded.
     * @example
     * //example
     * cc.Loader.getInstance().onResLoaded();
     */
    onResLoaded: function () {
        this._loadedNumber++;
    },

    /**
     * Get loading percentage
     * @return {Number}
     * @example
     * //example
     * cc.log(cc.Loader.getInstance().getPercentage() + "%");
     */
    getPercentage: function () {
        var percent = 0;
        if (this._totalNumber == 0) {
            percent = 100;
        } else {
            percent = (0 | (this._loadedNumber / this._totalNumber * 100));
        }
        return percent;
    },

    /**
     * release resources from a list
     * @param resources
     */
    releaseResources: function (resources) {
        if (resources && resources.length > 0) {
            var sharedTextureCache = cc.TextureCache.getInstance();
            var sharedEngine = cc.AudioEngine ? cc.AudioEngine.getInstance() : null;
            var sharedParser = cc.SAXParser.getInstance();
            var sharedFileUtils = cc.FileUtils.getInstance();

            var resInfo;
            for (var i = 0; i < resources.length; i++) {
                resInfo = resources[i];
                var type = this._getResType(resInfo);
                switch (type) {
                    case "IMAGE":
                        sharedTextureCache.removeTextureForKey(resInfo.src);
                        break;
                    case "SOUND":
                        if(!sharedEngine) throw "Can not find AudioEngine! Install it, please.";
                        sharedEngine.unloadEffect(resInfo.src);
                        break;
                    case "XML":
                        sharedParser.unloadPlist(resInfo.src);
                        break;
                    case "BINARY":
                        sharedFileUtils.unloadBinaryFileData(resInfo.src);
                        break;
                    case "TEXT":
                        sharedFileUtils.unloadTextFileData(resInfo.src);
                        break;
                    case "FONT":
                        this._unregisterFaceFont(resInfo);
                        break;
                    default:
                        throw "cocos2d:unknown filename extension: " + type;
                        break;
                }
            }
        }
    },
    
    resourceExists: function( resourcePath )
    {
        if ( !this._resourceMap )
        {
            return false;
        }
        
        return !!this._resourceMap[ resourcePath ];
    },

    _preload: function () {
        this._updatePercent();
        if (this._isAsync) {
            var frameRate = cc.Director.getInstance()._frameRate;
            if (frameRate != null && frameRate < 20) {
                cc.log("cocos2d: frame rate less than 20 fps, skip frame.");
                return;
            }
        }

        if (this._curNumber < this._totalNumber) {
            this._loadOneResource();
            this._curNumber++;
        }
    },

    _loadOneResource: function () {
        var sharedTextureCache = cc.TextureCache.getInstance();
        var sharedEngine = cc.AudioEngine ? cc.AudioEngine.getInstance() : null;
        var sharedParser = cc.SAXParser.getInstance();
        var sharedFileUtils = cc.FileUtils.getInstance();

        var resInfo = this._resouces[this._curNumber];
        var type = this._getResType(resInfo);
        switch (type) {
            case "IMAGE":
                sharedTextureCache.addImage(resInfo.src);
                break;
            case "SOUND":
                if(!sharedEngine) throw "Can not find AudioEngine! Install it, please.";
                sharedEngine.preloadSound(resInfo.src);
                break;
            case "XML":
                sharedParser.preloadPlist(resInfo.src);
                break;
            case "BINARY":
                sharedFileUtils.preloadBinaryFileData(resInfo.src);
                break;
            case "TEXT" :
                sharedFileUtils.preloadTextFileData(resInfo.src);
                break;
            case "FONT":
                this._registerFaceFont(resInfo);
                break;
            default:
                throw "cocos2d:unknown filename extension: " + type;
                break;
        }
        
        this._resourceMap[ resInfo.src ] = true;
    },

    _schedulePreload: function () {
        var _self = this;
        this._interval = setInterval(function () {
            _self._preload();
        }, this._animationInterval * 1000);
    },

    _unschedulePreload: function () {
        clearInterval(this._interval);
    },

    _getResType: function (resInfo) {
        var isFont = resInfo.fontName;
        if (isFont != null) {
            return cc.RESOURCE_TYPE["FONT"];
        } else {
            var src = resInfo.src;
            var ext = src.substring(src.lastIndexOf(".") + 1, src.length);

            var index = ext.indexOf("?");
            if(index > 0) ext = ext.substring(0, index);

            for (var resType in cc.RESOURCE_TYPE) {
                if (cc.RESOURCE_TYPE[resType].indexOf(ext) != -1) {
                    return resType;
                }
            }
            return ext;
        }
    },

    _updatePercent: function () {
        var percent = this.getPercentage();

        if (percent >= 100) {
            this._unschedulePreload();
            this._complete();
        }
    },

    _complete: function () {
        if (this._target && (typeof(this._selector) == "string")) {
            this._target[this._selector](this);
        } else if (this._target && (typeof(this._selector) == "function")) {
            this._selector.call(this._target, this);
        } else {
            this._selector(this);
        }

        this._curNumber = 0;
        this._loadedNumber = 0;
        this._totalNumber = 0;
    },

    _registerFaceFont: function (fontRes) {
        var srcArr = fontRes.src;
        var fileUtils = cc.FileUtils.getInstance();
        if (srcArr && srcArr.length > 0) {
            var fontStyle = document.createElement("style");
            fontStyle.type = "text/css";
            document.body.appendChild(fontStyle);

            var fontStr = "@font-face { font-family:" + fontRes.fontName + "; src:";
            for (var i = 0; i < srcArr.length; i++) {
                fontStr += "url('" + fileUtils.fullPathForFilename(encodeURI(srcArr[i].src)) + "') format('" + srcArr[i].type + "')";
                fontStr += (i == (srcArr.length - 1)) ? ";" : ",";
            }
            fontStyle.textContent += fontStr + "};";

            //preload
            //<div style="font-family: PressStart;">.</div>
            var preloadDiv = document.createElement("div");
            preloadDiv.style.fontFamily = fontRes.fontName;
            preloadDiv.innerHTML = ".";
            preloadDiv.style.position = "absolute";
            preloadDiv.style.left = "-100px";
            preloadDiv.style.top = "-100px";
            document.body.appendChild(preloadDiv);
        }
        cc.Loader.getInstance().onResLoaded();
    },

    _unregisterFaceFont: function (fontRes) {
        //todo remove style
    }
});

/**
 * Preload resources in the background
 * @param {Array} resources
 * @param {Function|String} selector
 * @param {Object} target
 * @return {cc.Loader}
 * @example
 * //example
 * var g_mainmenu = [
 *    {src:"res/hello.png"},
 *    {src:"res/hello.plist"},
 *
 *    {src:"res/logo.png"},
 *    {src:"res/btn.png"},
 *
 *    {src:"res/boom.mp3"},
 * ]
 *
 * var g_level = [
 *    {src:"res/level01.png"},
 *    {src:"res/level02.png"},
 *    {src:"res/level03.png"}
 * ]
 *
 * //load a list of resources
 * cc.Loader.preload(g_mainmenu, this.startGame, this);
 *
 * //load multi lists of resources
 * cc.Loader.preload([g_mainmenu,g_level], this.startGame, this);
 */
cc.Loader.preload = function (resources, selector, target) {
    if (!this._instance) {
        this._instance = new cc.Loader();
    }
    this._instance.initWithResources(resources, selector, target);
    return this._instance;
};

/**
 * Preload resources async
 * @param {Array} resources
 * @param {Function|String} selector
 * @param {Object} target
 * @return {cc.Loader}
 */
cc.Loader.preloadAsync = function (resources, selector, target) {
    if (!this._instance) {
        this._instance = new cc.Loader();
    }
    this._instance.setAsync(true);
    this._instance.initWithResources(resources, selector, target);
    return this._instance;
};

/**
 * Release the resources from a list
 * @param {Array} resources
 */
cc.Loader.purgeCachedData = function (resources) {
    if (this._instance) {
        this._instance.releaseResources(resources);
    }
};

/**
 * Returns a shared instance of the loader
 * @function
 * @return {cc.Loader}
 */
cc.Loader.getInstance = function () {
    if (!this._instance) {
        this._instance = new cc.Loader();
    }
    return this._instance;
};

cc.Loader._instance = null;


/**
 * Used to display the loading screen
 * @class
 * @extends cc.Scene
 */
cc.LoaderScene = cc.Scene.extend(/** @lends cc.LoaderScene# */{
    _logo: null,
    _logoTexture: null,
    _texture2d: null,
    _bgLayer: null,
    _label: null,
    _winSize:null,

    /**
     * Constructor
     */
    ctor: function () {
        cc.Scene.prototype.ctor.call(this);
        this._winSize = cc.Director.getInstance().getWinSize();
    },
    init:function(){
        cc.Scene.prototype.init.call(this);

        //logo
        var logoWidth = 500;
        var logoHeight = 500;
        var centerPos = cc.p(this._winSize.width / 2, this._winSize.height / 2);

        this._logoTexture = new Image();
        var _this = this, handler;
        this._logoTexture.addEventListener("load", handler = function() {
            _this._initStage(centerPos);
            this.removeEventListener('load', handler, false);
        });
        this._logoTexture.src = "data:image/png;base64,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QAAIAGuuv9tNAAgRACAATAAk67Sz6/7WTQAIEQAgAEwAWPv5ZxwEgCgBAALABIDV75/pIABECQAQACYArDL5Kw4CQJQAAAFgAsCnf10DAAEAAiDKBIB1XtrtGgAIABAAUSYALH/2MdcAIE4AgAAwAeALAItcAwABAAIgygSANdcscA0ABAAIgCgTANZY8SPXAEAAgACIMgFgjWW3uAYAQx8AgAAQACYAAAQAIAAEgAkAAAEACAABYAIAQAAAAkAAmAAAEACAABAAJgAAhjgAAAEgAEwAAAgAQAAIABMAAAIAEAACwAQAgAAABIAAMAEAIAAAASAATAAACABAAAgAEwAAQxUAgAAQACYAAAQAIAAEgAkAAAEACAABYAIAQAAAAkAAmAAAEACAABAAJgAABAAgAASACQCAoQoAQAAIABMAAAIAEAACwAQAgAAABIAAMAEAIAAAASAATAAACABAAAgAEwAAAgAQAALABADAUAUAIAAEgAkAAAEACAABYAIAQAAAAkAAmAAAEACAABAAJgAABAAgAASACQAAAQAIAAFgAgBgqAIAEAACwAQAgAAABIAAMAEAIAAAASAATAAACABAAAgAEwAAAgAQAALABACAAAAEgAAwAQAwVAEACAABYAIAQAAAAkAAmAAAEACAABAAJgAABAAgAASACQAAAQAIAAFgAgBAAAACQACYAAAYqgAABIAAMAEAIAAAASAATAAACABAAAgAEwAAAgAQAALABACAAAAEgAAwAQAgAAABIABMAAAMVQAAAkAAmAAAEACAABAAJgAABAAgAASACQAAAQAIAAFgAgBAAAACQACYAAAQAIAAEAAmAACGKgAAASAATAAACABAAAgAEwAAAgAQAALABACAAAAEgAAwAQAgAAABIABMAAAIAEAACAATAABDFQCAABAAJgAABAAgAASACQAAAQAIAAFgAgBAAAACQACYAAAQAIAAEAAmAAAEACAABIAJAIChCgBAAAgAEwAAAgAQAALABACAAAAEgAAwAQAgAAABIABMAAAIAEAACAATAAACAKje+oN8+6OdV/eV1cEUZwLABACAAACyay+qzetrrLyttW1V59BzxQfvCQABIAAABAAQSDbhguptVzSW3dLaurKzf0dx4ngqyygBIAAEAIAAAMjGnlOddXn9vhmtzfe1n3+mePfNVHTDBIAAEAAA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";
        this._logoTexture.width = logoWidth;
        this._logoTexture.height = logoHeight;

        // bg
        this._bgLayer = cc.LayerColor.create(cc.c4(32, 32, 32, 255));
        this._bgLayer.setPosition(0, 0);
        this.addChild(this._bgLayer, 0);

        //loading percent
        this._label = cc.LabelTTF.create("Loading... 0%", "Arial", 14);
        this._label.setColor(cc.c3(180, 180, 180));
        this._label.setPosition(cc.pAdd(centerPos, cc.p(0, -logoHeight / 2 - 10)));
        this._bgLayer.addChild(this._label, 10);
    },

    _initStage: function (centerPos) {
        this._texture2d = new cc.Texture2D();
        this._texture2d.initWithElement(this._logoTexture);
        this._texture2d.handleLoadedTexture();
        this._logo = cc.Sprite.createWithTexture(this._texture2d);
        this._logo.setScale(cc.CONTENT_SCALE_FACTOR());
        this._logo.setPosition(centerPos);
        this._bgLayer.addChild(this._logo, 10);
    },

    onEnter: function () {
        cc.Node.prototype.onEnter.call(this);
        this.schedule(this._startLoading, 0.3);
    },

    onExit: function () {
        cc.Node.prototype.onExit.call(this);
        var tmpStr = "Loading... 0%";
        this._label.setString(tmpStr);
    },

    /**
     * init with resources
     * @param {Array} resources
     * @param {Function|String} selector
     * @param {Object} target
     */
    initWithResources: function (resources, selector, target) {
        this.resources = resources;
        this.selector = selector;
        this.target = target;
    },

    _startLoading: function () {
        this.unschedule(this._startLoading);
        cc.Loader.preload(this.resources, this.selector, this.target);
        this.schedule(this._updatePercent);
    },

    _updatePercent: function () {
        var percent = cc.Loader.getInstance().getPercentage();
        var tmpStr = "Loading... " + percent + "%";
        this._label.setString(tmpStr);
        
        //LUMOS tell the browser that we've made progress
        lumosity.trigger( "game:loadProgress", [ percent / 100.0 ] );

        // if (percent >= 100)
        //     this.unschedule(this._updatePercent);
        //LUMOS - tell the browser that we finished loading so it can update the canvas
        if (percent >= 100)
        {
            this.unschedule(this._updatePercent);
            lumosity.trigger( "game:loadComplete" );
        }
    }
});

/**
 * Preload multi scene resources.
 * @param {Array} resources
 * @param {Function|String} selector
 * @param {Object} target
 * @return {cc.LoaderScene}
 * @example
 * //example
 * var g_mainmenu = [
 *    {src:"res/hello.png"},
 *    {src:"res/hello.plist"},
 *
 *    {src:"res/logo.png"},
 *    {src:"res/btn.png"},
 *
 *    {src:"res/boom.mp3"},
 * ]
 *
 * var g_level = [
 *    {src:"res/level01.png"},
 *    {src:"res/level02.png"},
 *    {src:"res/level03.png"}
 * ]
 *
 * //load a list of resources
 * cc.LoaderScene.preload(g_mainmenu, this.startGame, this);
 *
 * //load multi lists of resources
 * cc.LoaderScene.preload([g_mainmenu,g_level], this.startGame, this);
 */
cc.LoaderScene.preload = function (resources, selector, target) {
    if (!this._instance) {
        this._instance = new cc.LoaderScene();
        this._instance.init();
    }

    this._instance.initWithResources(resources, selector, target);

    var director = cc.Director.getInstance();
    if (director.getRunningScene()) {
        director.replaceScene(this._instance);
    } else {
        director.runWithScene(this._instance);
    }

    return this._instance;
};
