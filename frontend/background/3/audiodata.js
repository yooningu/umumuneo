"use strict";

/*
	Squee Powered!
*/

//
// Contains 2 AudioArray instances, one for the left channel, one for the right
//
var AudioData = function( data )
{
	this.left = new AudioArray( [] );
	this.right = new AudioArray( [] );
	if( typeof data !== 'undefined' ) {
		this.left.setData( data, 0 );
		this.right.setData( data, 64 );
	}
};

AudioData.prototype = 
{
	clear: function()
	{
		this.left.clear();
		this.right.clear();
		
	},
	copyFrom: function( audioData )
	{
		this.left.copyFrom( audioData.left );
		this.right.copyFrom( audioData.right );
	},
	copyMinFrom: function( audioData )
	{
		this.left.copyMinFrom( audioData.left );
		this.right.copyMinFrom( audioData.right );
	},
	copyMaxFrom: function( audioData )
	{
		this.left.copyMaxFrom( audioData.left );
		this.right.copyMaxFrom( audioData.right );
	},
	setData: function( data )
	{
		this.left.setData( data, 0 );
		this.right.setData( data, 64 );
	},
	reverse: function()
	{
		this.left.reverse();
		this.right.reverse();
	},
	smooth: function( factor, dir )
	{
		this.left.smooth( factor, dir );
		this.right.smooth( factor, dir );
	},
	min: function()
	{
		return Math.min( this.left.min(), this.right.min() );
	},
	max: function()
	{
		return Math.max( this.left.max(), this.right.max() );
	},
	sum: function(min,max)
	{
		return this.left.sum(min,max) + this.right.sum(min,max);
	},
	average: function()
	{
		return ( this.left.average() + this.right.average() / 2 );
	},
	add: function( audioData )
	{
		this.left.add( audioData.left );
		this.right.add( audioData.right );
	},
	subtract: function( audioData )
	{
		if( typeof audioData == 'object' ) {
			this.left.subtract( audioData.left );
			this.right.subtract( audioData.right );
		}
		else {
			this.left.subtract( audioData );
			this.right.subtract( audioData );
		}
	},
	multiply: function( f )
	{
		this.left.multiply( f );
		this.right.multiply( f );
	},
	power: function( f )
	{
		this.left.power( f );
		this.right.power( f );
	},
	divide: function( f )
	{
		this.left.divide( f );
		this.right.divide( f );
	},
	downsample: function( valuesPerSample )
	{
		this.left.downsample( valuesPerSample );
		this.right.downsample( valuesPerSample );
	},
	correctPinkNoise: function()
	{
		var max = 2.1029779444138;
		var dt = [1.0548608488838,0.76054078751554,0.61124787706261,0.52188737442096,0.47582581340335,0.442985940855,0.39506604448116,0.38179901474466,0.3791498265819,
				  0.35862620105656,0.34117808276167,0.31407858754586,0.32956896818321,0.32649587026332,0.32553041354753,0.33023063745582,0.33723850113961,
				  0.32845876137105,0.32345077632073,0.33371703524763,0.33559351013352,0.32755038614695,0.33723270172874,0.33152196761531,0.34253960054833,
				  0.33996676648346,0.35007384375669,0.34140414964718,0.35276302794926,0.45428847576802,0.57092841582994,0.56249676873287,0.64297260455787,
				  0.64261475342015,0.72339198663831,0.73733259583513,0.83130048006773,0.86110594108701,0.93924222866694,0.97183918188016,1.0510377466679,
				  1.1248085597157,1.1805661781629,1.2060520313183,1.2870901748538,1.3467060487469,1.419748566548,1.4930113442739,1.5233661865195,
				  1.6291546697418,1.6687760437528,1.7517802578211,1.7828743148843,1.8640559593836,1.9024009352922,1.9445452898741,2.0042892436186,
				  2.0429756359259,2.0702872782946,2.0901099761327,2.0997672257821,2.1029779444138,2.0654643664757,2.0357843961318 ];
		for( var i = 0; i < 64; i++ )
		{
			this.left.data[i] /= ( dt[ i ] / max );
			this.right.data[i] /= ( dt[ i ] / max );
		}
	}
};
