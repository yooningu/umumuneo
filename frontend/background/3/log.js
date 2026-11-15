
function _getErrorObject(){try { throw Error('') } catch(err) { return err; }}
		
function log()
{
	this.consoleLog = null;
	this.consoleWarn = null;
	this.consoleError = null;
	this.hook();
	
	this.htmlElement = document.createElement('div');
	this.contentElement = document.createElement('pre');
	this.buttonElement = document.createElement('button');
	
	this.htmlElement.appendChild( this.contentElement );
	this.htmlElement.appendChild( this.buttonElement );
	
	this.htmlElement.style.position = 'fixed';
	this.htmlElement.style.right = 0;
	this.htmlElement.style.bottom= 0;
	this.htmlElement.style.background = 'rgba( 0, 0, 0, 196 )';
	this.htmlElement.style.color = 'white';
	this.htmlElement.style.zIndex = '1000';
	this.htmlElement.style.visibility = 'visible';
	
	this.buttonElement.style.position = 'absolute';
	this.buttonElement.style.right = 0;
	this.buttonElement.style.top= 0;
	this.buttonElement.style.color = 'red';
	this.buttonElement.style.zIndex = '1000';
	this.buttonElement.innerHTML = '&times;';
	
	this.contentElement.style.width = 800 + 'px';
	this.contentElement.style.height = 200 + 'px';
	this.contentElement.style.overflow = 'auto';
	
	var self = this;
	var bodyCheckTimeout = function()
	{
		if( document.body && document.body.appendChild ) {
			document.body.appendChild( self.htmlElement );
		}
		else {
			setTimeout( function(){ bodyCheckTimeout(); }, 1 );
		}
	};
	setTimeout( function(){ bodyCheckTimeout(); }, 100 );
	
	this.buttonElement.addEventListener('click', function() {
		self.hide();
	});
	
	this.append( 'log started' );
	
}

log.prototype = {
	show: function() { this.htmlElement.style.display = 'block'; },
	hide: function() { this.htmlElement.style.display = 'none'; },
	hook: function()
	{
		var self = this;
		
		
	    this.console = window.console;
	    this.consoleLog = window.console.log;
	    this.consoleWarn = window.console.warn;
	    this.consoleError = window.console.error;
	    
	    window.console.log = function(){
            self.show();
	       self.append.apply( self, arguments );
	       self.consoleLog.apply(window.console, arguments);
	    };
	    window.console.warn = function(){
            self.show();
	        self.append.apply( self, arguments );
            self.consoleWarn.apply(window.console, arguments);
        };
	    window.console.error = function(){
            // do sneaky stuff
            self.show();
	        self.append.apply( self, arguments );
            self.consoleError.apply(window.console, arguments);
        };
       // window.onerror = function( message, url, linenumber, columnNo, error )
       // {
        //	console.error( message, url, linenumber, columnNo, error );
  		//	return false;
        //};
	},
	clear: function()
	{
		while (myNode.firstChild) {
			this.contentElement.removeChild(this.contentElement.firstChild);
		}
	},
	append: function(  )
	{

		try {
			var err = _getErrorObject();
			var caller_line = err.stack.split("\n");
			caller_line = caller_line[caller_line.length-1];
			var index = caller_line.indexOf("at ");
			var clean = caller_line.slice(index+2, caller_line.length);
			
			for(var i = 0; i < arguments.length; i++ ) {
				try {
					var obj = arguments[i];
					//console.log( caller_line, index, clean );
					if( typeof obj == 'object' ) obj = JSON.stringify( obj, null, 2 );
					
					var el = document.createElement('div');
					el.innerHTML = clean.replace( /^\s+/g, '' ).replace( /(http|file).+\//g, '' ) 
								 + ": " + obj;
					this.contentElement.insertBefore(el, this.contentElement.firstChild);
					//this.contentElement.appendChild( el );
					while( this.contentElement.childNodes.length > 100 ) {
						this.contentElement.removeChild(this.contentElement.lastChild);
					}
				}
				catch(ex) {console.log( ex );};
			}
		}
		catch(ex) {console.log( ex );};
	}
	
};

window.log = new log();
