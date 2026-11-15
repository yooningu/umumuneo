function getImage(url,resolve, reject, completed)
{
    var img = new Image();
    //var timeout = setTimeout(function() { 
    //	if( reject ) { reject(url); } 
    ///	if( completed ) { completed(url); } 
    //}, 1000);
    img.onload = function(){
    	//clearTimeout( timeout );
       	if( resolve ) resolve(url);
    	if( completed ) { completed(url); } 
    }
    img.onerror = function(){
    	//clearTimeout( timeout );
        if( reject ) reject(url);
    	if( completed ) { completed(url); } 
    }
    img.src = url;
}

/**
 * @class 
 * Class for writing css gradients
 **/
function BackgroundGradient( bg )
{
	this.bg = bg;
	
	this.colors = [];
	this.type = 'linear';
	this.linearDirection = 'top';
	
	this.radialPosition = 'center center'; // 
	this.radialSize = 'farthest-corner'; // ellipse (closest-side | closest-corner | farthest-side | farthest-corner | contain | cover) 
										 // circle  (closest-side | closest-corner | farthest-side | farthest-corner | contain | cover)  
										 // 20px 20px 
										 // 50% 50% 
					
	/**
	 * @function
     * @instance
	 **/					 
	this.updateElement = function()
	{
		if( this.bg  ) this.bg.updateCss();
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setSolidColor = function( col )
	{
		this.colors = [ [ 0, col ] ];
		this.updateElement();
		//this.bg.nextImage();
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setColorStops = function( colorStops )
	{
		this.colors = colorStops;
		this.updateElement();
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setGradientType = function( type )
	{
		this.type = type; // should be linear or radial
		this.updateElement();
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setLinearDirection = function( dir )
	{
		this.linearDirection = dir; // should be linear or radial
		this.updateElement();
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setRadialPosition = function( dir )
	{
		this.radialPosition = dir; // should be linear or radial
		this.updateElement();
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setRadialSize = function( size )
	{
		this.radialSize = size; // should be linear or radial
		this.updateElement();
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setLinearGradient = function( dir, colorStops ) 
	{
		this.type = 'linear';
		this.linearDirection = dir;
		this.colors = colorStops;
		this.updateElement();
		//this.bg.nextImage();
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setRadialGradient = function( position, size, colorStops ) 
	{
		this.type = 'radial';
		this.radialPosition = position;
		this.radialSize = size;
		this.colors = colorStops;
		this.updateElement();
		//this.bg.nextImage();
	}
	
	/**
	 * @function
     * @instance
     * @return {string} 
	 **/
	this.getCssColorStops = function()
	{
		var css = '';
		for( var i = 0; i < this.colors.length; i++ )
		{
			if( css.length ) css += ', ';
			css += this.colors[i][1] + ' ' + Math.round( 100 * this.colors[i][0] ) + '%';
		}
		return css;
	}
	
	/**
	 * @function
     * @instance
     * @return {string} 
	 **/
	this.getCssValue = function()
	{
		if( this.colors.length == 0 ) {
			return 'magenta';
		}
		else if( this.colors.length == 1 ) {
			return '' + this.colors[ 0 ][ 1 ] + '';
		}
		else if( this.type == 'radial' )
		{
			var css = '-webkit-radial-gradient(' + this.radialPosition + ', ' + this.radialSize + ', ';
			css += this.getCssColorStops();
			css += ' )';
			return css;						
		}
		else /* if( this.type == 'linear' ) */ {
			
			var css = '-webkit-linear-gradient(' + this.linearDirection + ', ';
			css += this.getCssColorStops();
			css += ' )';
			return css;						
		}
	}
}

/**
 * @class 
 * Class for maintaining image lists for slideshows
 **/
function BackgroundImage( bg )
{
	this.bg = bg;
	this.size = 'cover';
	this.opacity = 1;
	this.blur = 0;
	this.blend = 'normal';
	this.volume = 0;
	
	this.singleVideo = '';		
	this.singleImage = '';		
	this.imageList = [];
	this.imageListPlayList = [];
	this.imageProperty = '';
	
	this.currentImage = '';				
	this.currentSource = '';
	
	/**
	 * @function
     * @instance
	 **/
	this.updateElement = function()
	{
		if( this.bg  ) this.bg.updateCss();
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setImageSize = function( size )
	{
		this.size = size;
		this.updateElement();
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setBlur = function( blur )
	{
		this.blur = blur;
		this.updateElement();
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setBlendMode = function( blend )
	{
		this.blend = blend;
		this.updateElement();
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setImageOpacity = function( opacity )
	{
		this.opacity = opacity;
		this.updateElement();
	}
	
	
	/**
	 * @function
     * @instance
	 **/
	this.setVideoVolume = function( volume )
	{
		this.volume = volume;	
		this.updateElement();
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setSingleImage = function( file )
	{
		var updateImage = false;
		if( this.currentImage == '' || this.currentSource == 'file' ) 
		{
			updateImage = true;		
		}
		this.singleImage = file;
		if( updateImage ) {
			this.bg.nextImage();
		}
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setSingleVideo = function( file )
	{
		var updateVideo = false;
		if( this.currentImage == '' || this.currentSource == 'video' ) 
		{
			updateVideo = true;		
		}
		this.singleVideo = file;
		if( updateVideo ) {
			this.bg.nextImage();
		}
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setFilelist = function( files )
	{
		var updateImage = false;
		if( this.currentImage == '' || this.currentSource == 'folder' ) 
		{
			updateImage = true;		
		}
		this.imageList = files;
		this.imageListPlayList = [];
		if( updateImage ) {
			this.bg.nextImage();
		}
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.setRandomImageProperty = function( property )
	{
		var updateImage = false;
		if( this.currentImage == ''  || this.currentSource == 'ondemand' ) 
		{
			updateImage = true;		
		}
		this.imageProperty = property;
		if( updateImage ) {
			this.bg.nextImage();
		}
	}
	
	this.cbGetNextImageDone = function( image, cb )
	{
		//console.error( 'cbGetNextImageDone: ' + image );
		if( !image ) {
			this.currentSource = '';
		}
		this.currentImage = image;
		if( cb ) cb( image, cb  );
	}
	
	this.cbGetNextImageSingle = function( image, cb, callstack )
	{
		//console.error( 'cbGetNextImageSingle: ' + image );
		//console.log( 'none: ' + image );
		if( !image ) {
			image = this.singleImage;
			this.currentSource = 'file';
		}
		var fn = callstack.shift();
		fn.bind(this)(image, cb, callstack);
		//this.cbGetNextImageDone( image, cb, callstack );
	}
	
	this.cbGetNextVideoSingle = function( image, cb, callstack )
	{
		//console.error( 'cbGetNextVideoSingle: ' + image );
		//console.log( 'none: ' + image );
		if( !image ) {
			image = this.singleVideo;
			this.currentSource = 'video';
		}
		var fn = callstack.shift();
		fn.bind(this)(image, cb, callstack);
		//this.cbGetNextImageSingle( image, cb, callstack );
	}
	
	this.cbGetNextImageFileList = function( image, cb, callstack )
	{
		//console.error( 'cbGetNextImageFileList: ' + image );
		if( !image && typeof this.imageList == 'object' && this.imageList.length > 0 ) {
			var found = false;
			var maxLoops = 100;
			do { 
				if( this.imageListPlayList.length == 0 ) {
					// create new playlist
					for( var i = 0; i < this.imageList.length; i++ ) {
						this.imageListPlayList[i] = i;
					}
					// randomize a bit :D
					this.imageListPlayList.sort( function(a,b) { return Math.random()>=0.5; } );
					this.imageListPlayList.sort( function(a,b) { return Math.random()>=0.5; } );
					this.imageListPlayList.sort( function(a,b) { return Math.random()>=0.5; } );
					
					if( this.imageList[this.imageListPlayList[0]] == this.currentImage && this.imageListPlayList.length > 1 ) {
						// avoid first new image being the last used image
						var idx = 1 + Math.floor( Math.random() * (this.imageListPlayList.length-1) );
						var tmp = this.imageListPlayList[ 0 ];
						this.imageListPlayList[ 0 ] = this.imageListPlayList[ idx ];
						this.imageListPlayList[ idx ] = tmp;
					}
				}
				
				// get an index from playlist to use
				var idx = this.imageListPlayList.shift();							
				if( idx < this.imageList.length ) {
					image = this.imageList[ idx ];
					found = true;
				}
			}
			while( !found && maxLoops-- )
			this.currentSource = 'folder';
		}
		var fn = callstack.shift();
		fn.bind(this)(image, cb, callstack);
		//this.cbGetNextVideoSingle( image, cb, callstack );
	}
	
	/*
	this.cbGetNextImageRandomFile = function( image, cb )
	{
		if( image ) { 
			image = 'file:///' + image;
			this.currentSource = 'ondemand';
		}
		this.cbGetNextImageFileList( image, cb );
	}
	*/
	
	this.cbGetNextImageOnDemand = function( image, cb, callstack )
	{
		//console.error( 'cbGetNextImageOnDemand' );
		if( window.wallpaperRequestRandomFileForProperty ) 
		{
			var self = this;
			if( !this.blocked ) {
				this.blocked = true;
				window.wallpaperRequestRandomFileForProperty( this.imageProperty, function( p, i ) { 
					self.blocked = false;
					if( i ) {
						image = 'file:///' + i;
					}
					self.currentSource = 'ondemand';
					var fn = callstack.shift();
					fn.bind(self)(image, cb, callstack);
					//self.cbGetNextImageFileList( image, cb, callstack );
				} );
			}
			// blocked so ignore
		}
		else {
			var fn = callstack.shift();
			fn.bind(this)(image, cb, callstack);
			//this.cbGetNextImageFileList( "", cb, callstack );
		}
	}
	
	/**
	 * @function
     * @instance
	 **/
	this.blocked = false;
	this.getNextImage = function( cb ) 
	{
		// get image from folder under setting bgRandomFile
		//console.log( 'getNextImage' );
		//console.log( 'getNextImage : ' + (performance.now()/1000).toFixed(3) );
		
		var callstack = this.backgroundSourceCallstack.slice(0);
		var fn = callstack.shift();
		fn.bind(this)("", cb, callstack);
		
		//this.cbGetNextImageOnDemand( cb, callstack );
			
		/*
		var self = this;
		if( window.wallpaperRequestRandomFileForProperty ) {
			//console.log( 'getNextImage1 : ' + (performance.now()/1000).toFixed(3) );
			if( !this.blocked ) {
				this.blocked = true;
				window.wallpaperRequestRandomFileForProperty( this.imageProperty, function( p, i ) { 
					//console.log( 'getNextImage112 : ' + (performance.now()/1000).toFixed(3) + ' / ' + self.imageProperty + ' / ' + p + ' / ' + i ); 
					self.blocked = false;
					self.cbGetNextImageRandomFile( p, i, cb ); 
				} );
			}
		}
		else {
			this.cbGetNextImageRandomFile( "", "", cb );
			//console.log( 'getNextImage2 : ' + (performance.now()/1000).toFixed(3) );
		}
		*/
	}
	
	
	this.backgroundSource = '';
	this.backgroundSourceCallstack = [
			this.cbGetNextImageOnDemand,
			this.cbGetNextImageFileList,
			this.cbGetNextVideoSingle,
			this.cbGetNextImageSingle,
			this.cbGetNextImageDone
		];
		
	this.backgroundSourceCallstackOptions = 
	{
		'default':
		[
			this.cbGetNextImageOnDemand,
			this.cbGetNextImageFileList,
			this.cbGetNextVideoSingle,
			this.cbGetNextImageSingle,
			this.cbGetNextImageDone
		],
		'none':
		[
			this.cbGetNextImageDone
		],
		'image':
		[
			this.cbGetNextImageSingle,
			this.cbGetNextImageDone
		],
		'video':
		[
			this.cbGetNextVideoSingle,
			this.cbGetNextImageDone
		],
		'slideshow':
		[
			this.cbGetNextImageOnDemand,
			this.cbGetNextImageFileList,
			this.cbGetNextImageDone
		]
	} 
	
	this.setBackgroundSource = function( src ) 
	{
		this.backgroundSource = src;
		switch( this.backgroundSource )
		{
			case 'none':
			case 'image':
			case 'video':
			case 'slideshow':
				this.backgroundSourceCallstack = this.backgroundSourceCallstackOptions[this.backgroundSource].slice(0);
				this.bg.nextImage();
				break;
			default:
				this.backgroundSourceCallstack = this.backgroundSourceCallstackOptions['default'].slice(0);
				this.bg.nextImage();
				break;
		}
	}
}

/**
 * Background class giving accsss to {@link BackgroundImage} and {@link BackgroundGradient}
 * @class 
 * @property {bool}    usePreload  - weather or not to use preloading. Suggested to leave this set to true.
 * @property {object}  gradient  - Instance of {@link BackgroundGradient}
 * @property {object}  image    - Instance of {@link BackgroundImage}
 * @property {HTMLElement}  elGradient  - Element to apply CSS to.
 * @property {HTMLElement}  elImage  - Optional element to set css on for background image settings. Set to null if only one element is used
 **/
function Background( elGradient, elImage1, elImage2, elImage1Gradient, elImage2Gradient )
{
	this.elGradient = elGradient || null;
	this.elImage1 = elImage1 || null;
	this.elImage2 = elImage2 || null;
	this.elImage1Gradient = elImage1Gradient || null;
	this.elImage2Gradient = elImage2Gradient || null;
	this.elVideo1 = null;
	this.elVideo2 = null;
	this.elVideo1Source = null;
	this.elVideo2Source = null;
	
	if( this.elImage1 ) {
		this.elVideo1 = document.createElement( 'video' );
		this.elVideo1Source = document.createElement( 'source' );
		this.elVideo1.appendChild( this.elVideo1Source );
		this.elImage1.appendChild( this.elVideo1 );
		
		this.elVideo1.loop = true;
		this.elVideo1.volume = 0;
		this.elVideo1.poser = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
		
		this.elVideo1.style.position = 'absolute';
		this.elVideo1.style.width = '100%';
		this.elVideo1.style.height = '100%';
		this.elVideo1.style.objectFit = 'cover';
		//this.elVideo1.style.transform = 'translate3d(0,0,0)';
		//this.elVideo1.style.transformStyle = 'preserve-3d';
		//this.elVideo1.style.backfaceVisibility = 'hidden';
		//this.elVideo1.style.display = 'none';
	}
	
	if( this.elImage2 ) {
		this.elVideo2 = document.createElement( 'video' );
		this.elVideo2Source = document.createElement( 'source' );
		this.elVideo2.appendChild( this.elVideo2Source );
		this.elImage2.appendChild( this.elVideo2 );
		this.elVideo2.loop = true;
		this.elVideo2.volume = 0;
		this.elVideo2.poser = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
		
		this.elVideo2.style.position = 'absolute';
		this.elVideo2.style.width = '100%';
		this.elVideo2.style.height = '100%';
		this.elVideo2.style.objectFit = 'cover';
		//this.elVideo2.style.transform = 'translate3d(0,0,0)';
		//this.elVideo2.style.transformStyle = 'preserve-3d';
		//this.elVideo2.style.backfaceVisibility = 'hidden';
		//this.elVideo2.style.display = 'none';
	}
		
	if( this.elImage2Gradient ) this.elImage2Gradient.style.display = 'none';
	else if( this.elImage2 ) this.elImage2.style.display = 'none';
	
	this.usePreload = true;
	this.preloadImage = new Image();	
	
	this.gradient = new BackgroundGradient( this );
	this.image = new BackgroundImage( this );
	this.transition = new BackgroundTransition( this.elImage1Gradient ? this.elImage1Gradient : this.elImage1, 
												this.elImage2Gradient ? this.elImage2Gradient : this.elImage2, 
												true );
	
	this.paused = false;
	this.interval = 5000;
	this.intervalMultiply = 1;
	this.nextImageTime = performance.now() + 2000;

	this._intervalHandle = null;
	this._timeoutWaitingForTransition = null;
	this.canAnimate = this.elImage1 && this.elImage2;
	
	this.useTransitions = true;
	this.transitionDuration = 1;
	
					
	this.nextImageElement = this.elImage1;		
	this.elImage1Url = '';
	this.elImage2Url = '';
	this.lastImage = '';
	this.queuedImageUrl = '';
	this.isPreloading = false;
	
	this.onImageSet = null;

	this.animations = [
			[ 'bg-move-in-from-left', 'bg-move-out-from-left' ],
			[ 'bg-move-in-from-right', 'bg-move-out-from-right' ],
			[ 'bg-move-in-from-top', 'bg-move-out-from-top' ],
			[ 'bg-move-in-from-bottom', 'bg-move-out-from-bottom' ],
			[ 'bg-shuffle-in-from-left', 'bg-shuffle-out-from-left' ],
			[ 'bg-shuffle-in-from-right', 'bg-shuffle-out-from-right' ],
			[ 'bg-shuffle-in-from-top', 'bg-shuffle-out-from-top' ],
			[ 'bg-shuffle-in-from-bottom', 'bg-shuffle-out-from-bottom' ],
			[ 'bg-fade-in-in', 'bg-fade-in-out' ],
			[ 'bg-fade-out-in', 'bg-fade-out-out' ],
			[ 'bg-zoom-in-in', 'bg-zoom-in-out' ],
			[ 'bg-zoom-out-in', 'bg-zoom-out-out' ],
			[ 'bg-horz-zoom-in-in', 'bg-horz-zoom-in-out' ],
			[ 'bg-horz-zoom-out-in', 'bg-horz-zoom-out-out' ],
			[ 'bg-vert-zoom-in-in', 'bg-vert-zoom-in-out' ],
			[ 'bg-vert-zoom-out-in', 'bg-vert-zoom-out-out' ]
	];
	
	this.lastAddedAnimation = null;
	
	this.getAnimationIndex = function( animIn, animOut )
	{
		var idx = -1;
		for( var i = 0; i < this.animations.length; i++ )
		{
			var a = this.animations[ i ];
			if( a[ 0 ] == animIn && a[1] == animOut ) {
				idx = i;
				break;
			}
		}
		return idx;
	}
	
	this.addAnimation = function( animIn, animOut )
	{
		var idx = this.getAnimationIndex( animIn, animOut );
		if( idx == -1 ) {
			this.animations.push( [ animIn, animOut ] );
			this.lastAddedAnimation = [ animIn, animOut ];
		}
	}
	
	this.removeAnimation = function( animIn, animOut )
	{
		var idx = this.getAnimationIndex( animIn, animOut );
		if( idx != -1 ) {
			this.animations.splice( idx, 1 );
		}
	}
	
	this.triggerImageSet = function( el, img )
	{
		if( this.onImageSet ) {
			this.onImageSet( el, img );
		}
	}
	
	/**
	 * Pause the slideshow
	 * @function
     * @instance
	 **/
	this.pause = function()
	{
		if( this._intervalHandle ) {
			clearTimeout( this._intervalHandle );
			this._intervalHandle = null;
		}
		
		this.paused = true;
		this.pauseVideo();
	}
	
	/**
	 * Start the slideshow
	 * @function
     * @instance
     * @param {bool} trigger - if you want to update image instantly instead of wait for next slideshow update
	 **/
	this.play = function( trigger )
	{
		this.paused = false;
		this.unpauseVideo();
		
		var expectedTimeTillNext = this.nextImageTime - performance.now();
		
		trigger = trigger || ( expectedTimeTillNext < 0 );
		if( trigger ) {
			expectedTimeTillNext = 5; // just avoiding 0 as play might be called twice and this could cause it to trigger twice in a row .. 
		}
		
		if( !this._intervalHandle ) {
			if( this.transition.inTransition ) {
				//console.log( 'wait for transition : ' + this.useTransitions + ' : ' + trigger );
				// delay until transition is complete
				if( this._timeoutWaitingForTransition ) {
					clearTimeout( this._timeoutWaitingForTransition );
					this._timeoutWaitingForTransition = null;
				}
				var self = this;
				this._timeoutWaitingForTransition = setTimeout( function() {
					self.play( trigger );
				}, 100 );
			}
			else {
				//if( trigger ) {
				//	this.nextImage();
				//}
				//console.log( 'play : ' + this.useTransitions + ' : ' + trigger );
				var self = this;
				this.nextImageTime = performance.now() + this.interval * this.intervalMultiply + ( this.useTransitions ? 1000 * this.transitionDuration : 0 );
				var cb = function(){ 
						self.nextImage(); 
						
						clearTimeout( this._intervalHandle );
						
						self._intervalHandle = setTimeout( 
							cb, 
							self.interval * self.intervalMultiply + ( self.useTransitions ? 1000 * self.transitionDuration : 0  )
						);
				};
				this._intervalHandle = setTimeout( 
						cb, 
						expectedTimeTillNext 
							//? expectedTimeTillNext
							//: this.interval * this.intervalMultiply + ( this.useTransitions ? 1000 * this.transitionDuration : 0 )
				);
			}
		}
	}
	
	/**
	 * Will get a new image to show and apply it
	 * @function
     * @instance
	 **/
	this.nextImageQueueTimeout = null;
	this.nextImage = function()
	{
		// get image from .. random folder first, then playlist, then single file if no options left
		var self = this;
		
		if( this.nextImageQueueTimeout ) {
			clearTimeout( this.nextImageQueueTimeout );
			this.nextImageQueueTimeout  = null;
		}
			
		if( this.paused ) {
			
			this.nextImageQueueTimeout  = setTimeout( function() {
					clearTimeout( self.nextImageQueueTimeout );
					self.nextImageQueueTimeout = null;
					self.nextImage();
			}, 1000 );
		}
		else {
			this.nextImageTime = performance.now() + this.interval * this.intervalMultiply + ( this.useTransitions ? 1000 * this.transitionDuration : 0 );
			this.image.getNextImage(function(i) {
				self.setNextImage( i );
			});
		}
	}
	
	/**
	 * Set image to selected file ( will use preloader if selected )
	 * @function
     * @instance
     * @param {string} image to load
	 **/
	this.setNextImage = function(i)
	{
		if( i == this.lastImage ) {
			return;
		}
		if( !this.lastImage || !this.useTransitions || !this.canAnimate || this.animations.length == 0 ) {
			// no transitions or animations or first image
			// in case settings were changed with interfering timeouts
			this.queuedImageUrl = null;
			this.lastAddedAnimation = null;
			this.transition.inTransition = false;
			
			if( !this.usePreload || !i ) {
				this.isPreloading = false;
				this.preloadImage.onload = null;
				this.preloadImage.onerror = null;
				this.lastImage = i;
				if( !this.isVideo( i ) ) {
					this.preloadImage.src = i;
					this.playVideo1( '' );
				}
				else {
					this.playVideo1( i );
				}
				this.elImage1Url = i;
				
				if( this.elImage2Gradient ) this.elImage2Gradient.style.display = 'none';
				else if( this.elImage2 ) this.elImage2.style.display = 'none';
					
				if( this.elImage1Gradient ) this.elImage1Gradient.style.display = 'block';
				else if( this.elImage1 ) this.elImage1.style.display = 'block';
					
				this.updateCss();
				this.triggerImageSet( this.elImage1, i );
			}
			else {
				var self = this;
				var onLoadCallback = function() {
					self.preloadImage.onerror = null;
					self.preloadImage.onload = null;
					self.isPreloading = false;
					self.elImage1Url = self.lastImage = self.preloadImage.width != 0 ? i : null;
					if( self.elImage2Gradient ) self.elImage2Gradient.style.display = 'none';
					else if( self.elImage2 ) self.elImage2.style.display = 'none';
					if( self.elImage1Gradient ) self.elImage1Gradient.style.display = 'block';
					else if( self.elImage1 ) self.elImage1.style.display = 'block';
						
					self.updateCss();
					self.triggerImageSet( self.elImage1, i );
				};
				
				this.preloadImage.onerror = onLoadCallback;
				this.preloadImage.onload = onLoadCallback;
				if( !this.isVideo( i ) ) {
					this.playVideo1( '' );
					this.preloadImage.src = i;
				}
				else {
					setTimeout( function() { 
						self.playVideo1( i );
						self.elImage1Url = self.lastImage = i;
						self.preloadImage.onerror = null;
						self.preloadImage.onload = null;
						self.isPreloading = false;
						if( self.elImage2Gradient ) self.elImage2Gradient.style.display = 'none';
						else if( self.elImage2 ) self.elImage2.style.display = 'none';
						if( self.elImage1Gradient ) self.elImage1Gradient.style.display = 'block';
						else if( self.elImage1 ) self.elImage1.style.display = 'block';
							
						self.updateCss();
					}, 1 );
				}
			}
		}
		else {
			// using transitions
			if( this.transition.inTransition || this.isPreloading  ) {
				this.queuedImageUrl = i;
				//console.log( 'queue ' + this.transition.inTransition + ' || ' + this.isPreloading  );
			}
			else {
				this.queuedImageUrl = null;
				//console.log( 'unqueue' );
				
				var animIdx = Math.floor(Math.random() * this.animations.length );
				if( this.lastAddedAnimation ) {
					var animIdx2 = this.getAnimationIndex( this.lastAddedAnimation[ 0 ], this.lastAddedAnimation[ 1 ] );
					if( animIdx2 != -1 ) { animIdx = animIdx2; }
					this.lastAddedAnimation = null;
				}
				this.nextImageElement = ( this.elImage1Gradient && this.elImage1Gradient.style.display == 'none' )
											|| this.elImage1.style.display == 'none'
										? this.elImage1
										: this.elImage2;
				if( this.nextImageElement == this.elImage1 ) 
				{
					if( !this.usePreload || this.isVideo( i ) || !i ) {
						this.isPreloading = false;
						this.preloadImage.onload = null;
						this.preloadImage.onerror = null;
						this.lastImage = i;
						if( !this.isVideo( i ) ) {
							this.preloadImage.src = i;
							this.playVideo1( '' );
						}
						else {
							this.playVideo1( i );
						}
						this.elImage1Url = i;
						this.updateCss();
						this.triggerImageSet( this.elImage1, i );
						this.transition.start( this.animations[animIdx][0], this.animations[animIdx][1], this.transitionDuration, function() {
							if( self.queuedImageUrl ) {
								self.setNextImage( self.queuedImageUrl );
							}
						});
					}
					else {
						var self = this;
						this.isPreloading = true;
						var onLoadCallback = function() {
							self.preloadImage.onerror = null;
							self.preloadImage.onload = null;
							self.isPreloading = false;
							self.elImage1Url = self.lastImage = self.preloadImage.width != 0 ? i : null;
							self.updateCss();
							self.triggerImageSet( self.elImage1, i );
							self.transition.start( self.animations[animIdx][0], self.animations[animIdx][1], self.transitionDuration, function() {
								if( self.queuedImageUrl ) {
									self.setNextImage( self.queuedImageUrl );
								}
							});
						}
						this.preloadImage.onerror = onLoadCallback;
						this.preloadImage.onload = onLoadCallback;
						this.preloadImage.src = i;
					}
				}
				else if( this.nextImageElement == this.elImage2 )
				{
					if( !this.usePreload || this.isVideo( i ) || !i ) {
						this.isPreloading = false;
						this.preloadImage.onload = null;
						this.preloadImage.onerror = null;
						this.lastImage = i;
						if( !this.isVideo( i ) ) {
							this.preloadImage.src = i;
							this.playVideo2( '' );
						}
						else {
							this.playVideo2( i );
						}
						this.elImage2Url = i;
						this.updateCss();
						this.triggerImageSet( this.elImage2, i );
						this.transition.start( this.animations[animIdx][0], this.animations[animIdx][1], this.transitionDuration, function() {
							if( self.queuedImageUrl ) {
								self.setNextImage( self.queuedImageUrl );
							}
						});
					}
					else {
						var self = this;
						this.isPreloading = true;
						var onLoadCallback = function() {
							self.preloadImage.onerror = null;
							self.preloadImage.onload = null;
							self.isPreloading = false;
							self.elImage2Url = self.lastImage = self.preloadImage.width != 0 ? i : null;
							self.updateCss();
							self.triggerImageSet( self.elImage2, i );
							self.transition.start( self.animations[animIdx][0], self.animations[animIdx][1], self.transitionDuration, function() {
								if( self.queuedImageUrl ) {
									self.setNextImage( self.queuedImageUrl );
								}
							});
						}
						this.preloadImage.onerror = onLoadCallback;
						this.preloadImage.onload = onLoadCallback;
						this.preloadImage.src = i;
					}
				}
			}
		}
	}
	
	this.isVideo = function( fn )
	{
		var ext = fn ? fn.substr( -4 ).toLowerCase() : '';
		return ext == 'webm' || ext == 'ogg' || ext == 'ogv' || ext == 'ogm';
	}
	
	/**
	 * Called ( possibly async ) by {@link Background#setNextImage} 
	 * @function
     * @instance
	 **/
	this.updateCss = function()
	{
		if( this.elVideo1 ) { 
			this.elVideo1.style.objectFit = this.image.size;
			this.elVideo1.style.display = ( this.isVideo( this.elImage1Url ) ) 
									    ? 'block'
									    : 'none';
			this.elVideo1.volume = this.image.volume;
		}
		if( this.elVideo2 ) { 
			this.elVideo2.style.objectFit = this.image.size;
			this.elVideo2.style.display = ( this.isVideo( this.elImage2Url ) ) 
									    ? 'block'
									    : 'none';
			this.elVideo2.volume = this.image.volume;
		}
		//var animation = false;
		//if( animating ) {
		//	this.transition.setElements( this.elGradient, this.elImage1, false );
		//}
		//else {	
			if( this.elImage2 ) {
				var css = {
					'background': ( this.elImage2Url && !this.isVideo(this.elImage2Url) ? 'url("'+this.elImage2Url+'"),' : '' )  + this.gradient.getCssValue(),
					'backgroundPosition': 'center center',
					'backgroundRepeat': 'no-repeat',
					'backgroundSize': this.image.size,
					'mixBlendMode': this.image.blend,
					'opacity': this.image.opacity,
					'filter': 'blur('+this.image.blur+'px)',
				};
				for( var i in css ) {
					this.elImage2.style[ i ] = css[ i ];
				}
			}
			if( this.elImage1 ) {
				var css = {
					'background': ( this.elImage1Url && !this.isVideo(this.elImage1Url) ? 'url("'+this.elImage1Url+'"),' : '' )  + this.gradient.getCssValue(),
					'backgroundPosition': 'center center',
					'backgroundRepeat': 'no-repeat',
					'backgroundSize': this.image.size,
					'mixBlendMode': this.image.blend,
					'opacity': this.image.opacity,
					'filter': 'blur('+this.image.blur+'px)',
				};
				for( var i in css ) {
					this.elImage1.style[ i ] = css[ i ];
				}
			}
			
			var css = {};
			if( this.elImage1 ) {
				css = {
					'background': this.gradient.getCssValue()
				};
			}
			else {
				css = {
					'background': ( this.elImage1Url && !this.isVideo(this.elImage1Url) ? 'url("'+this.elImage1Url+'"),' : '' )  + this.gradient.getCssValue(),
					'backgroundPosition': 'center center',
					'backgroundRepeat': 'no-repeat',
					'backgroundSize': this.image.size,
					'backgroundBlendMode': this.image.blend
				};
			}
			for( var i in css ) {
				this.elGradient.style[ i ] = css[ i ];
				if( this.elImage1Gradient ) this.elImage1Gradient.style[i] = css[ i ];
				if( this.elImage2Gradient ) this.elImage2Gradient.style[i] = css[ i ];
			}
		//}
	}
	
	/**
	 * Unpause any video that was playing
	 * @function
     * @instance
	 **/
	this.unpauseVideo = function()
	{
		var v1 =  this.elImage1Url; //this.elVideo1Source.getAttribute('src') ;
		var v2 =  this.elImage2Url; //this.elVideo2Source.getAttribute('src') ;
		
		if( v1 && this.isVideo(v1) ) this.playVideo1( v1 );
		if( v2 && this.isVideo(v2) ) this.playVideo2( v2 );	
		
	}
	
	/**
	 * pause any video that was playing
	 * @function
     * @instance
	 **/
	this.pauseVideo = function(  )
	{
	    this.elVideo1.pause();
	    this.elVideo2.pause();
	}
	
	/**
	 * Play {src} on video1 element
	 * @function
     * @instance
	 * @param {string} src - video filename
	 **/
	this.playVideo1 = function( src )
	{
	    this.elVideo1.pause();
	    this.elVideo2.pause();
	    
	    var currentSrc = this.elVideo1Source.getAttribute('src');
	    if( src != currentSrc ) {
		    this.elVideo1Source.setAttribute('src', src); 

			if( src ) {
			    this.elVideo1.load();
			    this.elVideo1.play();
			}
		}
		else {
			if( src ) {
				this.elVideo1.play();
			}
		}
    }
	
	/**
	 * Play {src} on video2 element
	 * @function
     * @instance
	 * @param {string} src - video filename
	 **/
	this.playVideo2 = function( src )
	{
	    this.elVideo1.pause();
	    this.elVideo2.pause();

	    var currentSrc = this.elVideo2Source.getAttribute('src');
	    if( src != currentSrc ) {
		    this.elVideo2Source.setAttribute('src', src); 

			if( src ) {
			    this.elVideo2.load();
			    this.elVideo2.play();
			}
		}
		else {
			if( src ) {
				this.elVideo2.play();
			}
		}
    }
	
	/**
	 * Set interval between image updates
	 * @function
     * @instance
     * @param {int} ms - milliseconds between image changes when multiplier is set to 1
	 **/
	this.setInterval = function( ms )
	{
		ms = Math.max( 1, ms );
		if( this.interval != ms ) {
			this.interval = ms;
			if( this._intervalHandle ) {
				this.pause();
				this.play();
			}
		}
	}
	
	/**
	 * Set interval multiplier 
	 * @function
     * @instance
     * @param {int} i - time multiplier for interval, mostly implemented for easier settings
	 **/
	this.setIntervalMultiplier = function(i)
	{
		i = Math.max( 1, 1*i );
		if( this.intervalMultiply != i ) {
			this.intervalMultiply = i;
			if( this._intervalHandle ) {
				this.pause();
				this.play();
			}
		}
	}
	
	/**
	 * Set interval multiplier 
	 * @function
     * @instance
     * @param {bool} useTransitions - weather or not to use transitions
	 **/
	this.setUseTransitions = function( useTransition ) 
	{
		if( useTransition != this.useTransitions ) {
			this.useTransitions = useTransition;
			if( this._intervalHandle ) {
				this.pause();
				this.play();
			}
		}
	}
	
	/**
	 * Set Transition Duration
	 * @function
     * @instance
     * @param {float} duration - duration of transition in seconds
	 **/
	this.setTransitionDuration = function( duration ) 
	{
		if( duration != this.transitionDuration ) {
			this.transitionDuration = duration;
			if( this._intervalHandle ) {
				this.pause();
				this.play();
			}
		}
	}
	
	this.updateCss();
}
	

/**
 * @class 
 * Background class to process wallpaper engine property updates and apply those to a {@link Background} 
 **/
function BackgroundSettingsProxy( bg, cfg )
{
	this.bg = bg;
	this.config = {
		
		'background-source': null,
		
		'video-file': null,
		'video-volume': null,
		
		'image-file': null,
		'image-ondemand': null,
		'image-folder': null,
		'image-size': null,
		'image-opacity': null,
		'image-blend': null,
		'image-blur': null,
		
		'slideshow-use-transitions': null,
		'slideshow-transition-duration': null,
		'slideshow-interval': null,
		'slideshow-interval-multiply': null,
		
		'gradient-type': null,
		
		'color-count': null,
		'color-1': null,
		'color-2': null,
		'color-3': null,
		'color-4': null,
		'color-5': null,
		
		'slideshow-transition-fade': null,
		'slideshow-transition-fade-in': null,
		'slideshow-transition-fade-out': null,
		'slideshow-transition-zoom-in': null,
		'slideshow-transition-zoom-out': null,
		'slideshow-transition-zoom-horz-in': null,
		'slideshow-transition-zoom-horz-out': null,
		'slideshow-transition-zoom-vert-in': null,
		'slideshow-transition-zoom-vert-out': null,
		'slideshow-transition-move-left': null,
		'slideshow-transition-move-right': null,
		'slideshow-transition-move-top': null,
		'slideshow-transition-move-bottom': null,
		'slideshow-transition-shuffle-left': null,
		'slideshow-transition-shuffle-right': null,
		'slideshow-transition-shuffle-top': null,
		'slideshow-transition-shuffle-bottom': null
	}
	
	for( var i in cfg ) {
		if( cfg.hasOwnProperty( i ) && this.config.hasOwnProperty( i ) )
		{
			this.config[ i ] = cfg[ i ];
		}
	}
	
	this.settings = {
		// for tracking files in the userDirectoryFilesAddedOrChanged and userDirectoryFilesRemoved events
		backgrounds: [],					
		// for tracking color settings
		colors: ['black','black','black','black','black'],
		useColors: 1
	};
	
	/**
	 * @function
     * @instance
	 * @param {bool} b - true = pause, false = play
	 **/
	this.setPaused = function( b ) 
	{ 
		if( b ) { 
			this.bg.pause(); 
		}
		else { 
			this.bg.play(); 
		}
	};

	/**
	 * @function
     * @instance
	 * @param {object} p - update properties from wallpaper engine
	 **/
	this.applyUserProperties = function( p )
	{
		// basic background image settings
		
        
        if( this.config['background-source'] != null && 'object' == typeof p[this.config['background-source']] ) {
			this.bg.image.setBackgroundSource( this.getCombo( p[this.config['background-source']], '', [ '', 'none', 'image', 'video', 'slideshow'] ) );
        }
		
		if( this.config['image-ondemand'] != null && 'object' == typeof p[this.config['image-ondemand']] ) {
			if( p[this.config['image-ondemand']].value ) {
				this.bg.image.setRandomImageProperty( this.config['image-ondemand'] );
			}
			else {
				this.bg.image.setRandomImageProperty(  '' );
			}
		 	//console.log( 'on demand ' + p[this.config['image-ondemand']].value)	
		}
		
        if( this.config['slideshow-use-transitions'] != null && 'object' == typeof p[this.config['slideshow-use-transitions']] ) {
        	this.bg.setUseTransitions( this.getBool( p[this.config['slideshow-use-transitions']] ) );
        }
        if( this.config['slideshow-transition-duration'] != null && 'object' == typeof p[this.config['slideshow-transition-duration']] ) {
        	this.bg.setTransitionDuration( this.getSlider( p[this.config['slideshow-transition-duration']], 0, 3600 ) );
        }
        if( this.config['slideshow-interval'] != null && 'object' == typeof p[this.config['slideshow-interval']] ) {
        	this.bg.setInterval( this.getSlider( p[this.config['slideshow-interval']], 1, 3600*24 ) * 1000 );
        }
        if( this.config['slideshow-interval-multiply'] != null && 'object' == typeof p[this.config['slideshow-interval-multiply']] ) {
        	this.bg.setIntervalMultiplier( this.getSlider( p[this.config['slideshow-interval-multiply']], 1, 3600*24 )  );
        }
		
        if( this.config['video-file'] != null && 'object' == typeof p[this.config['video-file']] ) {
			this.bg.image.setSingleVideo( this.getFile( p[this.config['video-file']] ) );
        }
        if( this.config['video-volume'] != null && 'object' == typeof p[this.config['video-volume']] ) {
        	this.bg.image.setVideoVolume( this.getSlider( p[this.config['video-volume']], 0, 100 ) / 100 );
        }
        if( this.config['image-file'] != null && 'object' == typeof p[this.config['image-file']] ) {
			this.bg.image.setSingleImage( this.getFile( p[this.config['image-file']] ) );
        }
        if( this.config['image-size'] != null && 'object' == typeof p[this.config['image-size']] ) {
        	this.bg.image.setImageSize( this.getCombo( p[this.config['image-size']], 'contain', ['contain', 'cover'] ) );
        }
        if( this.config['image-opacity'] != null && 'object' == typeof p[this.config['image-opacity']] ) {
        	this.bg.image.setImageOpacity( this.getSlider( p[this.config['image-opacity']], 0, 100 ) / 100 );
        }
        
        if( this.config['image-blur'] != null && 'object' == typeof p[this.config['image-blur']] ) {
        	this.bg.image.setBlur( this.getSlider( p[this.config['image-blur']], 0, 100000000 ) );
        }
        if( this.config['image-blend'] != null && 'object' == typeof p[this.config['image-blend']] ) {
        	this.bg.image.setBlendMode( this.getCombo( p[this.config['image-blend']], 'normal', ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge', 'color-burn', 'hard-light', 'soft-light', 'difference', 'exclusion', 'hue', 'saturation', 'color', 'luminosity']) );
        }

        // gradient settings
        if( this.config['gradient-type'] != null && 'object' == typeof p[this.config['gradient-type']] ) {
        	var gradient = this.getCombo( p[this.config['gradient-type']] );
        	gradient = gradient.split(',');
        	if( gradient[0] == 'linear' ){
        		this.bg.gradient.setGradientType( 'linear');
        		if( gradient.length > 1 ) this.bg.gradient.setLinearDirection( gradient[1] );
        	}
        	else if( gradient[0] == 'radial' ){
        		this.bg.gradient.setGradientType( 'radial');
        		if( gradient.length > 1 ) this.bg.gradient.setRadialPosition( gradient[1] );
        		if( gradient.length > 2 ) this.bg.gradient.setRadialSize( gradient[2] );
        		
        	}
        }
        
        // color settings
        var colorSettingsUpdated = false;
        if( this.config['color-count'] != null && 'object' == typeof p[this.config['color-count']] ) {
        	this.settings.useColors = this.getSlider( p[this.config['color-count']], 1, 5 );
        	colorSettingsUpdated = true;
        }		
        if( this.config['color-1'] != null && 'object' == typeof p[this.config['color-1']] ) {
        	this.settings.colors[0] = this.getColor( p[this.config['color-1']] );
        	colorSettingsUpdated = true;
        }				        
        if( this.config['color-2'] != null && 'object' == typeof p[this.config['color-2']] ) {
        	this.settings.colors[1] = this.getColor( p[this.config['color-2']] );
        	colorSettingsUpdated = true;
        }				        
        if( this.config['color-3'] != null && 'object' == typeof p[this.config['color-3']] ) {
        	this.settings.colors[2] = this.getColor( p[this.config['color-3']] );
        	colorSettingsUpdated = true;
        }				        
        if( this.config['color-4'] != null && 'object' == typeof p[this.config['color-4']] ) {
        	this.settings.colors[3] = this.getColor( p[this.config['color-4']] );
        	colorSettingsUpdated = true;
        }				        
        if( this.config['color-5'] != null && 'object' == typeof p[this.config['color-5']] ) {
        	this.settings.colors[4] = this.getColor( p[this.config['color-5']] );
        	colorSettingsUpdated = true;
        }
        if( colorSettingsUpdated ) {
        	// update color settings correctly
    		var colorStops = [];
    		for( var i = 0; i < this.settings.useColors; i++ )
    		{
    			colorStops.push( [ i / (this.settings.useColors-1), this.settings.colors[i] ] ); // array is [ position in %, color ]
    		}
    		this.bg.gradient.setColorStops( colorStops );		        		
        }
		
        if( this.config['slideshow-transition-fade-in'] != null && 'object' == typeof p[this.config['slideshow-transition-fade-in']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-fade-in']] ) ) {
        		 this.bg.addAnimation('bg-fade-in-in', 'bg-fade-in-out'); 
        	}
        	else { this.bg.removeAnimation('bg-fade-in-in', 'bg-fade-in-out'); }
        }
		
        if( this.config['slideshow-transition-fade'] != null && 'object' == typeof p[this.config['slideshow-transition-fade']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-fade']] ) ) {
        		 this.bg.addAnimation('bg-fade-in-in', 'bg-fade-in-out'); 
        		 this.bg.addAnimation('bg-fade-out-in', 'bg-fade-out-out'); 
        	}
        	else { 
        		this.bg.removeAnimation('bg-fade-in-in', 'bg-fade-in-out'); 
        		this.bg.removeAnimation('bg-fade-out-in', 'bg-fade-out-out'); 
        	}
        }
		
        if( this.config['slideshow-transition-fade-out'] != null && 'object' == typeof p[this.config['slideshow-transition-fade-out']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-fade-out']] ) ) { 
        		this.bg.addAnimation('bg-fade-out-in', 'bg-fade-out-out'); 
        	}
        	else { this.bg.removeAnimation('bg-fade-out-in', 'bg-fade-out-out'); }
        }
		
        if( this.config['slideshow-transition-zoom-in'] != null && 'object' == typeof p[this.config['slideshow-transition-zoom-in']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-zoom-in']] ) ) {
        		 this.bg.addAnimation('bg-zoom-in-in', 'bg-zoom-in-out'); 
        	}
        	else { this.bg.removeAnimation('bg-zoom-in-in', 'bg-zoom-in-out'); }
        }
		
        if( this.config['slideshow-transition-zoom-out'] != null && 'object' == typeof p[this.config['slideshow-transition-zoom-out']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-zoom-out']] ) ) { 
        		this.bg.addAnimation('bg-zoom-out-in', 'bg-zoom-out-out'); 
        	}
        	else { this.bg.removeAnimation('bg-zoom-out-in', 'bg-zoom-out-out'); }
        }
		
        if( this.config['slideshow-transition-zoom-horz-in'] != null && 'object' == typeof p[this.config['slideshow-transition-zoom-horz-in']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-zoom-horz-in']] ) ) {
        		 this.bg.addAnimation('bg-horz-zoom-in-in', 'bg-horz-zoom-in-out'); 
        	}
        	else { this.bg.removeAnimation('bg-horz-zoom-in-in', 'bg-horz-zoom-in-out'); }
        }
		
        if( this.config['slideshow-transition-zoom-horz-out'] != null && 'object' == typeof p[this.config['slideshow-transition-zoom-horz-out']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-zoom-horz-out']] ) ) { 
        		this.bg.addAnimation('bg-horz-zoom-out-in', 'bg-horz-zoom-out-out'); 
        	}
        	else { this.bg.removeAnimation('bg-horz-zoom-out-in', 'bg-horz-zoom-out-out'); }
        }
		
        if( this.config['slideshow-transition-zoom-vert-in'] != null && 'object' == typeof p[this.config['slideshow-transition-zoom-vert-in']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-zoom-vert-in']] ) ) {
        		 this.bg.addAnimation('bg-vert-zoom-in-in', 'bg-vert-zoom-in-out'); 
        	}
        	else { this.bg.removeAnimation('bg-vert-zoom-in-in', 'bg-vert-zoom-in-out'); }
        }
		
        if( this.config['slideshow-transition-zoom-vert-out'] != null && 'object' == typeof p[this.config['slideshow-transition-zoom-vert-out']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-zoom-vert-out']] ) ) { 
        		this.bg.addAnimation('bg-vert-zoom-out-in', 'bg-vert-zoom-out-out'); 
        	}
        	else { this.bg.removeAnimation('bg-vert-zoom-out-in', 'bg-vert-zoom-out-out'); }
        }
		
        if( this.config['slideshow-transition-move-left'] != null && 'object' == typeof p[this.config['slideshow-transition-move-left']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-move-left']] ) ) { 
        		this.bg.addAnimation('bg-move-in-from-left', 'bg-move-out-from-left'); 
        	}
        	else { this.bg.removeAnimation('bg-move-in-from-left', 'bg-move-out-from-left'); }
        }
		
        if( this.config['slideshow-transition-move-right'] != null && 'object' == typeof p[this.config['slideshow-transition-move-right']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-move-right']] ) ) { 
        		this.bg.addAnimation('bg-move-in-from-right', 'bg-move-out-from-right'); 
        	}
        	else { this.bg.removeAnimation('bg-move-in-from-right', 'bg-move-out-from-right'); }
        }
		
        if( this.config['slideshow-transition-move-top'] != null && 'object' == typeof p[this.config['slideshow-transition-move-top']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-move-top']] ) ) { 
        		this.bg.addAnimation('bg-move-in-from-top', 'bg-move-out-from-top'); 
        	}
        	else { this.bg.removeAnimation('bg-move-in-from-top', 'bg-move-out-from-top'); }
        }
		
        if( this.config['slideshow-transition-move-bottom'] != null && 'object' == typeof p[this.config['slideshow-transition-move-bottom']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-move-bottom']] ) ) { 
        		this.bg.addAnimation('bg-move-in-from-bottom', 'bg-move-out-from-bottom'); 
        	}
        	else { this.bg.removeAnimation('bg-move-in-from-bottom', 'bg-move-out-from-bottom'); }
        }
		
        if( this.config['slideshow-transition-shuffle-left'] != null && 'object' == typeof p[this.config['slideshow-transition-shuffle-left']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-shuffle-left']] ) ) { 
        		this.bg.addAnimation('bg-shuffle-in-from-left', 'bg-shuffle-out-from-left'); 
        	}
        	else { this.bg.removeAnimation('bg-shuffle-in-from-left', 'bg-shuffle-out-from-left'); }
        }
		
        if( this.config['slideshow-transition-shuffle-right'] != null && 'object' == typeof p[this.config['slideshow-transition-shuffle-right']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-shuffle-right']] ) ) { 
        		this.bg.addAnimation('bg-shuffle-in-from-right', 'bg-shuffle-out-from-right'); 
        	}
        	else { this.bg.removeAnimation('bg-shuffle-in-from-right', 'bg-shuffle-out-from-right'); }
        }
		
        if( this.config['slideshow-transition-shuffle-top'] != null && 'object' == typeof p[this.config['slideshow-transition-shuffle-top']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-shuffle-top']] ) ) { 
        		this.bg.addAnimation('bg-shuffle-in-from-top', 'bg-shuffle-out-from-top'); 
        	}
        	else { this.bg.removeAnimation('bg-shuffle-in-from-top', 'bg-shuffle-out-from-top'); }
        }
		
        if( this.config['slideshow-transition-shuffle-bottom'] != null && 'object' == typeof p[this.config['slideshow-transition-shuffle-bottom']] ) {
        	if( this.getBool( p[this.config['slideshow-transition-shuffle-bottom']] ) ) { 
        		this.bg.addAnimation('bg-shuffle-in-from-bottom', 'bg-shuffle-out-from-bottom'); 
        	}
        	else { this.bg.removeAnimation('bg-shuffle-in-from-bottom', 'bg-shuffle-out-from-bottom'); }
        }
	}
	
	/**
	 * @function
     * @instance
	 * @param {string} property - name of property being update
	 * @param {Array} files - array of filenames
	 **/
	this.userDirectoryFilesAddedOrChanged = function( property, files )
	{
		var self = this;
        files = files.map( function(a) { return 'file:///' + a; } );
        if( property == this.config['image-folder']  ) {
	        this.settings.backgrounds = this.settings.backgrounds.concat( files.filter( function( item ) { return self.settings.backgrounds.indexOf(item) < 0; } ) );
			bg.image.setFilelist( self.settings.backgrounds );
		}
	}
	
	/**
	 * @function
     * @instance
	 * @param {string} property - name of property being update
	 * @param {Array} files - array of filenames
	 **/
	this.userDirectoryFilesRemoved = function( property, files ) 
	{
        files = files.map( function(a) { return 'file:///' + a; } );			        
        if( property == this.config['image-folder'] ) {
	        this.settings.backgrounds = this.settings.backgrounds.filter( function( item ) { return files.indexOf(item) < 0; } );
			bg.image.setFilelist( this.settings.backgrounds );
		}
	}
	
	
	this.getColor = function( val ) { return 'rgb(' + val.value.split(' ').map(function(c) {return Math.ceil(c * 255);}).join(',') + ')'; }
	this.getColorAsArray = function( val ) { return val.value.split(' ').map(function(c) {return Math.ceil(c * 255);}); }
	this.getSlider = function( val, min, max ) { return Math.max( min, Math.min( max, 1*val.value ) ); }
	this.getBool = function( val ) { return val.value ? true : false; }
	this.getFile = function( val ) { return val.value ? 'file:///' + val.value : ''; }
	this.getCombo = function( val, def, opts ) { opts = opts || []; if( opts.length ) { return opts.indexOf( val.value ) === -1 ? def : val.value; } return val.value; }

}



/**
 * @class 
 * Background Transition class starts transitions and handles the oncomplete events. 
 **/
function BackgroundTransition( el1, el2, animateBoth )
{
	this.el1 = el1;
	this.el2 = el2;
	this.animateBoth = animateBoth || false;
	
	this.inTransition = false;
	
	this._newElements = null;
	
	this.setElements = function( el1, el2, animateBoth )
	{
		if( this.inTransition ) {
			this._newElements = [ el1, el2, animateBoth || false ];
		}
		else {
			this.el1 = el1;
			this.el2 = el2;
			this.animateBoth = animateBoth || false;
		}
	}
	
	this.transitionCompleted = function( callback )
	{
		this.inTransition = false;
		this.el1.style.animation = '';
		this.el2.style.animation = '';
		if( callback ) { callback(); }
	}
	
	this.stop = function()
	{
		var evt = document.createEvent('Event');
		evt.initEvent('animationend', true, true);
		this.el1.dispatchEvent( evt );
		this.el2.dispatchEvent( evt );
	}
	
	this.start = function( animationIn, animationOut, duration, callback )
	{
		if( this.inTransition ) return;
		this.inTransition = true;
		var self = this;
		
		
		if( this._newElements ) {
			this.el1 = this._newElements[0];
			this.el2 = this._newElements[1];
			this.animateBoth = this._newElements[2];
			this._newElements = null;
		}
		
		duration = 1*duration || 1;
		
		if( this.animateBoth ) {
			var el1Visible = this.el1.style.display != 'none';
			var el2Visible = this.el2.style.display != 'none';
			
			if( el2Visible ) { 
				var fn1 = function() { 
					self.el2.removeEventListener( 'animationend', fn1 );
					self.el2.style.display = 'none';
					self.transitionCompleted( callback );
				}
				this.el1.style.animation = '';
				this.el2.style.animation = '';
				setTimeout( function() {
					self.el1.style.opacity = 1;
					self.el1.style.display = 'block';
					self.el1.style.animation = animationIn + ' ' + duration + 's ease-in-out forwards';
					self.el2.style.animation = animationOut + ' ' + duration + 's ease-in-out forwards';
				},1);
				this.el2.addEventListener( 'animationend', fn1 );
			}
			else {
				var fn1 = function() { 
					self.el2.removeEventListener( 'animationend', fn1 );
					self.el1.style.display = 'none';
					self.transitionCompleted( callback );
				}
				this.el1.style.animation = '';
				this.el2.style.animation = '';
				setTimeout( function() {
					self.el2.style.opacity = 1;
					self.el2.style.display = 'block';
					self.el1.style.animation = animationOut + ' ' + duration + 's ease-in-out forwards';
					self.el2.style.animation = animationIn + ' ' + duration + 's ease-in-out forwards';
				},1);
				this.el2.addEventListener( 'animationend', fn1 );
			}
			
		}
		else {
			var el2Visible = this.el2.style.display != 'none';
			
			if( el2Visible ) { 
				var fn1 = function() { 
					self.el2.removeEventListener( 'animationend', fn1 );
					self.el2.style.display = 'none';
					self.transitionCompleted( callback );
				}
				this.el2.style.animation = '';
				setTimeout( function() {
					self.el2.style.animation = animationOut + ' ' + duration + 's ease-in-out forwards';
				},1);
				this.el2.addEventListener( 'animationend', fn1 );
			}
			else {
				var fn1 = function() { 
					self.el2.removeEventListener( 'animationend', fn1 );
					self.transitionCompleted( callback );
				}
				this.el2.style.animation = '';
				setTimeout( function() {
					self.el2.style.display = 'block';
					self.el2.style.animation = animationIn + ' ' + duration + 's ease-in-out forwards';
				},1);
				this.el2.addEventListener( 'animationend', fn1 );
			}
		}
	}
	
	
}