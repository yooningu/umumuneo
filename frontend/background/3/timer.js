
function timer()
{
	this.prefix = '';
	this.timers = {};
	
	this.htmlElement = document.createElement('div');
	this.contentElement = document.createElement('pre');
	this.buttonWrapper = document.createElement('div');
	
	this.btnReset = document.createElement('button');
	this.btnReset.innerHTML = 'Reset';
	this.btnUpdate = document.createElement('button');
	this.btnUpdate.innerHTML = 'Update';
	this.btnAutoRefresh = document.createElement('button');
	this.btnAutoRefresh.innerHTML = 'AutoRefresh';
	
	this.htmlElement.appendChild( this.contentElement );
	this.htmlElement.appendChild( this.buttonWrapper );
	this.buttonWrapper.appendChild( this.btnReset );
	this.buttonWrapper.appendChild( this.btnUpdate );
	this.buttonWrapper.appendChild( this.btnAutoRefresh );
	
	this.htmlElement.style.position = 'fixed';
	this.htmlElement.style.right = 0;
	this.htmlElement.style.top= 0;
	this.htmlElement.style.background = 'rgba( 0, 0, 0, 196 )';
	this.htmlElement.style.color = 'white';
	this.htmlElement.style.zIndex = '1000';
	this.htmlElement.style.visibility = 'visible';
	
	
	var bodyCheckTimeout = function()
	{
		if( document.body && document.body.appendChild ) {
			document.body.appendChild( self.htmlElement );
		}
		else {
			setTimeout( function(){ bodyCheckTimeout(); }, 100 );
		}
	};
	setTimeout( function(){ bodyCheckTimeout(); }, 100 );
	
	var self = this;
	this.btnReset.addEventListener( 'click', function()
	{
		self.resetAll();
		self.logToConsole();
	});
	this.btnUpdate.addEventListener( 'click', function()
	{
		self.logToConsole();
	});
	var interval = null;
	this.btnAutoRefresh.addEventListener( 'click', function()
	{
		if( interval === null )
		{
			interval = setInterval(function() {
				self.logToConsole();
			}, 1000 );
			self.btnAutoRefresh.innerHTML = 'Stop Autorefresh';
		}
		else {
			clearInterval( interval );
			interval = null;
			self.btnAutoRefresh.innerHTML = 'Start Autorefresh';
		}
	});
	
	
}

timer.prototype = {
	setPrefix: function( prefix )
	{
		
	},
	start: function( timer )
	{ 
		timer = this.prefix + timer;
		var t;
		if( !this.timers.hasOwnProperty( timer ) ) 
		{
			t = { 
				count: 0,
				total: 0,
				slowest: -1,
				fastest: -1,
				lastTime: 0,
				lastStart: 0,
				isRunning: false
			};
			this.timers[ timer ] = t;
		}
		else {
			t = this.timers[ timer ];
		}
		t.isRunning = true;
		t.lastStart = performance.now();
	},
	stop: function( timer )
	{
		timer = this.prefix + timer;
		if( this.timers.hasOwnProperty( timer ) ) 
		{
			var t = this.timers[ timer ];
			if( t.isRunning ) {
				var time = performance.now() - t.lastStart;
				t.total += time;
				t.lastTime = time;
				t.count++;
				if( time > t.slowest || t.fastest === -1  ) t.slowest = time;
				if( time < t.fastest || t.fastest === -1 ) t.fastest = time;
			}
		}
	},
	reset: function( timer )
	{
		if( this.timers.hasOwnProperty( timer ) ) 
		{
			t = { 
				count: 0,
				total: 0,
				slowest: -1,
				fastest: -1,
				lastTime: 0,
				lastStart: 0,
				isRunning: false
			};
			this.timers[ timer ] = t;
		}
	},
	resetAll: function()
	{
		this.timers = [];
	},
	hide: function()
	{
		this.htmlElement.style.display = 'none';
	},
	show: function()
	{
		this.htmlElement.style.display = '';
	},
	logToConsole: function()
	{
		var output = '';
		for( var i in this.timers )
		{
			if( !this.timers.hasOwnProperty(i) ) continue;
			var spacePadding = '                              ';
			output += ( i + spacePadding ).substr( 0, 30 ) 
					+ " (" 
					+ ( "          " + this.timers[i].count ).slice( -10 ) 
					+ "x): " 
					+ ( "          " +this.timers[i].fastest.toFixed(3)  ).slice( -10 ) 
					+ "ms / " 
					+ ( "          " +(this.timers[i].total / this.timers[i].count).toFixed(3)  ).slice( -10 ) 
					+ "ms / " 
					+ ( "          " +this.timers[i].slowest.toFixed(3) ).slice( -10 ) 
					+ "ms";
			output += "\n";
			
		}
		this.contentElement.innerHTML = output;
		//console.log( output );
	}
};

window.timer = new timer();
