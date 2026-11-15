"use strict";

/*
	Squee Powered!
*/

// 
// used to store the audio data of only the left or right channel
//
// raw data can be found in AudioArray.data array
// 
var AudioArray = function( data )
{
	data = data || [];
	this.data = new Array( 64 );
	this.dataBuffer = new Array( 64 );
	for( var i = 0; i < 64; i++ ) {
		if( data.length <= i )  this.data[i] = 0;
		else if( isNaN( data[i] ) )  this.data[i] = 0;
		else this.data[i] = data[i];
	}
}

AudioArray.prototype = {
	clear: function()
	{
		for( var i = 0; i < 64; i++ ) {
			 this.data[i] = 0;
		}
	},
	copyFrom: function( audioArray ) 
	{
		for( var i = 0; i < 64; i++ ) {
			if( audioArray.data.length <= i )  this.data[i] = 0;
			else if( isNaN( audioArray.data[i] ) )  this.data[i] = 0;
			else this.data[i] = audioArray.data[i];
		}
	},
	copyMinFrom: function( audioArray ) 
	{
		var v = 0;
		for( var i = 0; i < 64; i++ ) {
			if( audioArray.data.length <= i ) v = 0;
			else if( isNaN( audioArray.data[i] ) )  v = 0;
			else v = audioArray.data[i];
			if( v < this.data[i] ) this.data[i] = v;
		}
	},
	copyMaxFrom: function( audioArray ) 
	{
		var v = 0;
		for( var i = 0; i < 64; i++ ) {
			if( audioArray.data.length <= i ) v = 0;
			else if( isNaN( audioArray.data[i] ) )  v = 0;
			else v = audioArray.data[i];
			if( v > this.data[i] ) this.data[i] = v;
		}
	},
	setData: function( data, startIdx )
	{
		if( typeof startIdx === 'undefined' ) startIdx = 0;
		
		for( var i = 0; i < 64; i++ ) {
			if( data.length-startIdx <= i )  this.data[i] = 0;
			else if( isNaN( data[i+startIdx] ) )  this.data[i] = 0;
			else this.data[i] = data[i+startIdx];		
		}
	},
	get: function( min, max )
	{
		if( typeof( max ) === 'undefined' ) max = min;
		
		var total = 0;
		for( var i =min; i <= max; i++ ){
			total += this.data[ i ];
		}
		total /= ( max - min + 1 );
		return total;
	},
	sum: function( min, max )
	{
		if( typeof( max ) === 'undefined' ) max = min;
		
		var total = 0;
		for( var i =min; i <= max; i++ ){
			total += this.data[ i ];
		}
		return total;
	},
	min: function()
	{
		var min = Number.POSITIVE_INFINITY;
		for( var i = 0; i < 64; i++ ){
			if( this.data[i] < min ) {
				min = this.data[i];	
			}
		}
		return min;
	},
	max: function( min, max )
	{
		if( typeof( min ) === 'undefined' ) min = 0;
		if( typeof( max ) === 'undefined' ) max = 63;
		var maxVal = Number.NEGATIVE_INFINITY;
		for( var i = min; i <= max; i++ ){
			if( this.data[i] > maxVal ) {
				maxVal = this.data[i];	
			}
		}
		return maxVal;
	},
	average: function( min, max )
	{
		if( typeof( min ) === 'undefined' ) min = 0;
		if( typeof( max ) === 'undefined' ) max = 63;
		var total = 0;
		for( var i = min; i <= max; i++ ){
			total += this.data[i];
		}
		return total / ( max - min + 1 );
	},
	reverse: function()
	{
		for( var i = 0; i < 32; i++)
		{
			var tmp = this.data[i];
			this.data[i] = this.data[63-i];
			this.data[63-i] = tmp;
		}
	},
	smooth: function( factor, dir )
	{
		dir = dir || 0;
		factor = Math.max( 0, Math.min( 1, factor ) );
		
		// the basic values for a 1d convolution matrix that ranges from [1,1,1,1,1] to [4,16,64,16,4]
		var perc0 = 1+3*(1-factor);
		var perc1 = 1+15*(1-factor);
		var perc2 = 1+63*(1-factor);
		
		var total = 0;
		var cnt = 0;
		for( var i = 0; i < 64; i++ ) {
			total = this.data[ i ]*perc2; cnt = perc2;
			if( dir >= 0 && i > 1 ) { total += this.data[ i-2 ]*perc0; cnt += perc0; }
			if( dir >= 0 && i > 0 ) { total += this.data[ i-1 ]*perc1; cnt += perc1; }
			if( dir <= 0 && i < 63 ) { total += this.data[ i+1 ]*perc1; cnt += perc1; }
			if( dir <= 0 && i < 62 ) { total += this.data[ i+2 ]*perc0; cnt += perc0; }
				
			this.dataBuffer[i] = total / cnt;
		}			
		for( var i = 0; i < 64; i++ ) {
			this.data[i] = this.dataBuffer[i];
		}
	},
	add: function( audioArray )
	{
		if( typeof audioArray == 'object' ) {
			for( var i = 0; i < 64; i++ ){
				this.data[i] += audioArray.data[i];
			}
		}
		else {
			for( var i = 0; i < 64; i++ ){
				this.data[i] += audioArray;
			}
		}
	},
	subtract: function( audioArray )
	{
		if( typeof audioArray == 'object' ) {
			for( var i = 0; i < 64; i++ ){
				this.data[i] -= audioArray.data[i];
			}
		}
		else {
			for( var i = 0; i < 64; i++ ){
				this.data[i] -= audioArray;
			}
		}
	},
	multiply: function( f )
	{
		if( isNaN(f) || !isFinite(f) ) return;
		
		for( var i = 0; i < 64; i++ ){
			this.data[i] *= f;
		}
	},
	divide: function( f )
	{
		if( isNaN(f) || !isFinite(f)  || f == 0 ) return;
		
		for( var i = 0; i < 64; i++ ){
			this.data[i] /= f;
		}
	},
	power: function( f )
	{
		if( isNaN(f) || !isFinite(f) ) return;
		
		for( var i = 0; i < 64; i++ ){
			this.data[i] = Math.pow( this.data[i], f );
		}
	},
	downsample: function( values )
	{
		for( var i = 0; i < 64; i++ ) {
			this.dataBuffer[i] = 0;
		}
		
		switch( values ) 
		{
			case 1: return;
			case 2: // half
				this.dataBuffer[0] = this.max( 0, 0 );
				this.dataBuffer[1] = this.max( 1, 1 );
				this.dataBuffer[2] = this.max( 2, 2 );
				this.dataBuffer[3] = this.max( 3, 3 );
				this.dataBuffer[4] = this.max( 4, 4 );
				this.dataBuffer[5] = this.max( 5, 5 );
				this.dataBuffer[6] = this.max( 6, 6 );
				this.dataBuffer[7] = this.max( 7, 7 );
				this.dataBuffer[8] = this.max( 8, 8 );
				this.dataBuffer[9] = this.max( 9, 9 );
				this.dataBuffer[10] = this.max( 10, 11 );
				this.dataBuffer[11] = this.max( 12, 13 );
				this.dataBuffer[12] = this.max( 14, 15 );
				this.dataBuffer[13] = this.max( 16, 17 );
				this.dataBuffer[14] = this.max( 18, 19 );
				this.dataBuffer[15] = this.max( 20, 21 );
				this.dataBuffer[16] = this.max( 22, 23 );
				this.dataBuffer[17] = this.max( 24, 25 );
				this.dataBuffer[18] = this.max( 26, 27 );
				this.dataBuffer[19] = this.max( 28, 29 );
				this.dataBuffer[20] = this.max( 30, 31 );
				this.dataBuffer[21] = this.max( 32, 33 );
				this.dataBuffer[22] = this.max( 34, 35 );
				this.dataBuffer[23] = this.max( 36, 37 );
				this.dataBuffer[24] = this.max( 38, 39 );
				this.dataBuffer[25] = this.max( 40, 41 );
				this.dataBuffer[26] = this.max( 42, 43 );
				this.dataBuffer[27] = this.max( 44, 45 );
				this.dataBuffer[28] = this.max( 46, 47 );
				this.dataBuffer[29] = this.max( 48, 49 );
				this.dataBuffer[30] = this.max( 50, 51 );
				this.dataBuffer[31] = this.max( 52, 53 );
				break;
			case 4:
				this.dataBuffer[0] = this.max( 0, 0 );
				this.dataBuffer[1] = this.max( 1, 1 );
				this.dataBuffer[2] = this.max( 2, 2 );
				this.dataBuffer[3] = this.max( 3, 3 );
				this.dataBuffer[4] = this.max( 4, 4 );
				this.dataBuffer[5] = this.max( 5, 5 );
				this.dataBuffer[6] = this.max( 6, 7 );
				this.dataBuffer[7] = this.max( 8, 9 );
				this.dataBuffer[8] = this.max( 10, 12 );
				this.dataBuffer[9] = this.max( 13, 16 );
				this.dataBuffer[10] = this.max( 17, 20 );
				this.dataBuffer[11] = this.max( 21, 26 );
				this.dataBuffer[12] = this.max( 27, 32 );
				this.dataBuffer[13] = this.max( 32, 37 );
				this.dataBuffer[14] = this.max( 38, 44 );
				this.dataBuffer[15] = this.max( 44, 52 );
				break;
			case 8:
				this.dataBuffer[0] = this.max( 0, 0 );
				this.dataBuffer[1] = this.max( 1, 2 );
				this.dataBuffer[2] = this.max( 3, 4 );
				this.dataBuffer[3] = this.max( 5, 7 );
				this.dataBuffer[4] = this.max( 8, 12 );
				this.dataBuffer[5] = this.max( 13, 20 );
				this.dataBuffer[6] = this.max( 21, 32 );
				this.dataBuffer[7] = this.max( 32, 52 );
				break;
			
		}
		for( var i = 0; i < 64; i++ ) {
			this.data[i] = this.dataBuffer[i];
		}
	}
	
};
