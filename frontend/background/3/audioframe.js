"use strict";

/*
	Squee Powered!
*/

function AudioFrame( opts )
{
	this.audioData = new AudioData();
	this.audioDataPrev = new AudioData();
	this.audioDataPrevBasic = new AudioData();
	this.audioDataBuffer = new AudioData();
	this.audioDataNormalized = new AudioData();
	this.audioDataNormalizedBasic = new AudioData();
	this.audioDataResult = new AudioData();
	this.audioPeakAverage = 1;
	this.audioValleyAverage = 1;
	this.audioPeakAverageBasic = 0.5;
	this.audioValleyAverageBasic = 0.5;
	
	this.peakHistoryWriteIdx = 0;
	this.peakHistory = [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
						0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
						0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
						0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,
						0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];
	this.hasAudio = false;
	
	this.config = {
		normalize: false,
		normalizeFactor: 0.5,
		motionBlur: false,
		motionBlurFactor: 0.5,
		smooth: false,
		smoothFactor: 0.05,
		powerOf: 1,
		mono: true,
		ampFactor: 1,
		downSample: 1,
		reverseFreq: false,
		eqStrength: 0.5,
		eqWidth: 15,
		eqFreq1: 1000,
		eqFreq2: 10000,
		eqFreq3: 15000,
		eqFreq1Strength: 1,
		eqFreq2Strength: 1,
		eqFreq3Strength: 1
	};
	
	// idx to freq
	// freq = (idx/64) ^ sqrt( 2 )
	
	// freq to idx
	//  freq  = (idx/64) ^ sqrt( 2 ) * 22000
	//  (freq/22000) ^ sqrt( 1/2 ) = idx/64
	//  (freq/22000) ^ sqrt( 1/2 ) * 64
	
	if( typeof opts == 'object' ) {
		for( var i in opts ) {
			if( opts.hasOwnProperty( i ) && this.config.hasOwnProperty( i ) ) {
				this.config[ i ] = opts[ i ];
			}
		}
	}
	
	this.update = function( data, isFake )
	{
		isFake = isFake || false;
		try {
			this.audioData.setData( data );
			
			if( !isFake ) {
				this.audioData.correctPinkNoise();
			}
			
			if( this.config.mono ) {
				this.audioDataBuffer.copyFrom( this.audioData );
				this.audioDataBuffer.left.add( this.audioData.right );
				this.audioDataBuffer.right.add( this.audioData.left );
				this.audioDataBuffer.left.divide(2);
				this.audioDataBuffer.right.divide(2);
				this.audioData.copyFrom( this.audioDataBuffer );
			}
			
			this.audioDataPrev.copyFrom( this.audioDataNormalized );
			this.audioDataPrevBasic.copyFrom( this.audioDataNormalizedBasic );
			this.audioDataNormalizedBasic.copyFrom( this.audioDataNormalizedBasic );
			
			this.audioDataNormalizedBasic.copyFrom( this.audioData );
			
			for( var i = 0; i < 64; i++ ) {
				var a = this.getEqValueForIdx( i );
				
				this.audioData.left.data[i] *= a;
				this.audioData.right.data[i] *= a;
				
				if( i <= 0 || i >= 10 ) { 
					this.audioDataNormalizedBasic.left.data[i] = 0;
					this.audioDataNormalizedBasic.right.data[i] = 0;
				}
			}	
			
			
			this.audioDataNormalized.copyFrom( this.audioData );
			if( this.config.reverseFreq ) {
				this.audioDataNormalized.reverse();
			}
			if( this.config.downSample ) {
				//this.audioDataNormalized.downsample( this.config.downSample );
			}
			
			if( this.config.smooth ) {
				// using a 1d convolution matrix to smooth. 
				// See AudioData::smooth() function for the values I've use in case you might want to chage those
				this.audioDataNormalized.smooth( this.config.smoothFactor );
			}	
			
			var maxValue = this.audioDataNormalized.max();
			var minValue = this.audioDataNormalized.min();
			
			this.audioPeakAverage = this.audioPeakAverage * this.config.normalizeFactor 
									+ maxValue * (1-this.config.normalizeFactor);
			this.audioPeakAverage = Math.max( this.audioPeakAverage, 0.001 );
			
			this.audioValleyAverage = this.audioValleyAverage * this.config.normalizeFactor 
									+ minValue * (1-this.config.normalizeFactor);
			this.audioValleyAverage = Math.max( this.audioValleyAverage, 0.001 );
			
			var maxValue = this.audioDataNormalizedBasic.max();
			var minValue = this.audioDataNormalizedBasic.min();
			
			this.audioPeakAverageBasic = this.audioPeakAverageBasic * 0.999
										+ maxValue * (1-0.999);
			this.audioPeakAverageBasic = Math.max( this.audioPeakAverageBasic, 0.001 );
			
			this.audioValleyAverageBasic = this.audioValleyAverageBasic * 0.999
										+ minValue * (1-0.999);
			this.audioValleyAverageBasic = Math.min( this.audioValleyAverageBasic, 0.001 );
			
			
			if( this.config.normalize ) {
				// divide by peak average to normalize
				this.audioDataNormalizedBasic.subtract( this.audioValleyAverageBasic );
				this.audioDataNormalizedBasic.divide( this.audioPeakAverageBasic - this.audioValleyAverageBasic );
				
				this.audioDataNormalized.subtract( this.audioValleyAverage );
				this.audioDataNormalized.divide( this.audioPeakAverage - this.audioValleyAverage );
			}
			
			var maxValue = this.audioDataNormalized.max();
			var minValue = this.audioDataNormalized.min();
			this.audioDataNormalized.subtract( minValue );
			this.audioDataNormalized.divide( maxValue - minValue );
			this.audioDataNormalized.power( this.config.powerOf );		
			this.audioDataNormalized.multiply( maxValue - minValue );
			
			
			//var maxValue = this.audioDataNormalizedBasic.max();
			//var minValue = this.audioDataNormalizedBasic.min();
			//this.audioDataNormalizedBasic.subtract( minValue );
			//this.audioDataNormalizedBasic.divide( maxValue - minValue );
			//this.audioDataNormalizedBasic.power( 2 );		
			//this.audioDataNormalizedBasic.multiply( maxValue - minValue );
			
			if( !isFake ) {
				this.peakHistory[ this.peakHistoryWriteIdx ] = maxValue;
				this.peakHistoryWriteIdx = ( this.peakHistoryWriteIdx+1) % this.peakHistory.length;
				
				
				var totalPeakValue = 0;
				for( var i = 0; i < this.peakHistory.length; i++ ) {
					totalPeakValue += this.peakHistory[i];
				}
				if( totalPeakValue > 0.01 ) {
					this.hasAudio = true;
				}
				else {
					this.hasAudio = false;
				}
			}
			
			
			if( this.config.motionBlur ) {
				// motion blur is basically using the old frame to create more smooth movement over several frames
				this.audioDataBuffer.copyFrom( this.audioDataPrev );
				this.audioDataBuffer.multiply( this.config.motionBlurFactor );
				this.audioDataNormalized.multiply( (1-this.config.motionBlurFactor) );
				this.audioDataNormalized.add( this.audioDataBuffer );
				
				this.audioDataBuffer.copyFrom( this.audioDataPrevBasic );
				this.audioDataBuffer.multiply( 0.33 );
				this.audioDataNormalizedBasic.multiply( (1-0.33) );
				this.audioDataNormalizedBasic.add( this.audioDataBuffer );
			}
			
			this.audioDataResult.copyFrom( this.audioDataNormalized );
			this.audioDataResult.multiply( this.config.ampFactor );
		}
		catch( ex ) { console.log( ex.message ); }
	}
	
	this.renderEQ = function( ctx )
	{
		ctx.fillStyle = 'rgba( 1, 1, 1, 0.25 )';
		ctx.strokeStyle = 'red';
		ctx.lineWidth = 1;
		
		ctx.beginPath();
		ctx.fillRect( 100, 100, 420, 300 );
		
		ctx.beginPath();
		ctx.moveTo( 100, 100 );
		ctx.lineTo( 420, 100 );
		
		ctx.moveTo( 100, 300 );
		ctx.lineTo( 420, 300 );
		
		ctx.stroke();
		
		ctx.strokeStyle = 'silver';
		ctx.beginPath();
		for( var i = 0; i < 64; i++ ) {
			var x = 100 + ( 320 / 63 ) * i;
			var y = 300 - 200 * this.getEqValueForIdx( i );
			if( i == 0 ) {
				ctx.moveTo( x, y );
			}
			else {
				ctx.lineTo( x, y );
			}
		}
		ctx.stroke();
		var maxVal = this.audioData.left.max();
		
		ctx.strokeStyle = 'rgb( 64, 0, 0 )';
		ctx.beginPath();
		for( var i = 0; i < 64; i++ ) {
			var x = 100 + ( 320 / 63 ) * i;
			var f = this.getEqValueForIdx( i );
			if( f == 0 ) f = 0.00000000000000001;
			var y = 300 - 200 * ( this.audioData.left.data[ i ] / maxVal / f  )  ;
			if( i == 0 ) {
				ctx.moveTo( x, y );
			}
			else {
				ctx.lineTo( x, y );
			}
		}
		ctx.stroke();
		
		ctx.strokeStyle = 'rgb( 0, 128, 0 )';
		ctx.beginPath();
		for( var i = 0; i < 64; i++ ) {
			var x = 100 + ( 320 / 63 ) * i;
			var y = 300 - 200 * ( this.audioData.left.data[ i ] / maxVal );
			if( i == 0 ) {
				ctx.moveTo( x, y );
			}
			else {
				ctx.lineTo( x, y );
			}
		}
		ctx.stroke();
		
		var maxVal = this.audioDataNormalizedBasic.left.max();
		/*
		ctx.strokeStyle = 'rgb( 0, 0, 128 )';
		ctx.beginPath();
		for( var i = 0; i < 64; i++ ) {
			var x = 100 + ( 320 / 63 ) * i;
			var y = 300 - 200 * ( this.audioDataNormalizedBasic.left.data[ i ] / maxVal )  ;
			if( i == 0 ) {
				ctx.moveTo( x, y );
			}
			else {
				ctx.lineTo( x, y );
			}
		}
		var avgLow = this.audioDataNormalizedBasic.left.average(1, 8);
		var y = 300 - 200 * ( avgLow / maxVal )  ;
				ctx.moveTo( x, y );
				ctx.lineTo( x+100, y );
		ctx.stroke();
		*/
	}
	
	this.getEqValueForIdx = function( idx )
	{
		try {
			var eq1 = this.freqToIdx( this.config.eqFreq1 );
			var eq2 = this.freqToIdx( this.config.eqFreq2 );
			var eq3 = this.freqToIdx( this.config.eqFreq3 );
			
			var dist1 = ( eq1 - idx );
			var dist2 = ( eq2 - idx );
			var dist3 = ( eq3 - idx );
			
			var result = 0;
			var valuesUsed = 0;
			
			var c = 10;
			var w = 10;
			if( idx < ( w * 2 + 1 ) )
			{
				//var p = idx / (w*2);
				// use cos from -PI to -PI
				//var v = (1 + Math.cos( -Math.PI + Math.PI*2*p )) / 2;
				//result += v;
				//valuesUsed++;
			}
			
			if( Math.abs( dist1 ) <= this.config.eqWidth ) {
				var min = eq1 - this.config.eqWidth;
				var max = eq1 + this.config.eqWidth;
				var p = ( idx - min ) / ( max - min );
				var v = (1 + Math.cos( -Math.PI + Math.PI*2*p )) / 2;
				result = v * this.config.eqFreq1Strength;
				//result += v;
				valuesUsed += this.config.eqFreq1Strength;//Math.pow( v, 1/1.4142 );
			}
			if( Math.abs( dist2 ) <= this.config.eqWidth ) {
				var min = eq2 - this.config.eqWidth;
				var max = eq2 + this.config.eqWidth;
				var p = ( idx - min ) / ( max - min );
				var v = (1 + Math.cos( -Math.PI + Math.PI*2*p )) / 2;
				result = Math.max( result, v * this.config.eqFreq2Strength );
				//result += v;
				valuesUsed += this.config.eqFreq2Strength;//Math.pow( v, 1/1.4142 );
				
			}
			if( Math.abs( dist3 ) <= this.config.eqWidth ) {
				var min = eq3 - this.config.eqWidth;
				var max = eq3 + this.config.eqWidth;
				var p = ( idx - min ) / ( max - min );
				var v = (1 + Math.cos( -Math.PI + Math.PI*2*p )) / 2;
				result = Math.max( result, v * this.config.eqFreq3Strength );
				//result += v;
				valuesUsed += this.config.eqFreq3Strength;//Math.pow( v, 1/1.4142 );
			}
		}
		catch( ex ) { console.log( ex ); }
			
		return this.config.eqStrength * result + ( 1 - this.config. eqStrength );// / valuesUsed;
	}
	
	this.idxToFreq = function( idx )
	{
		return -188.75596010894685 +  81.79508702900829 * Math.pow( 30.416291139283476, 0.2812954890617726 + idx / 49.91248369525583 );
		// -44.51401880248667 +  77.50771033219084 * Math.pow( 2.8864295611172226, 13.050180958147799 + idx \/ 0.293946557709426 )
		return -44.51401880248667 +  77.50771033219084 * Math.pow( 2.8864295611172226, 0.293946557709426 + (idx/1) / 13.050180958147799 );
	}
	
	this.getBaseLog = function getBaseLog(x, y) {
	 	return Math.log(x) / Math.log(y);
	}
	
	this.freqToIdx = function( freq )
	{
		var v1 = -188.75596010894685;
		var v2 = 81.79508702900829;
		var v3 = 30.416291139283476;
		var v4 = 0.2812954890617726;
		var v5 = 49.91248369525583;
		var val = ( this.getBaseLog( (freq - v1 ) / v2, v3 ) - v4 ) * v5;
		
		// freq = v1 + v2 * Math.pow( v3, v4 * idx / v5 ) + v6 * Math.pow( v7, v8 * idx / v9 );
		// freq - v1 = v2 * Math.pow( v3, v4 * idx / v5 ) + v6 * Math.pow( v7, v8 * idx / v9 );
		
		// freq = -44.51401880248667 +  77.50771033219084 * Math.pow( 2.8864295611172226, 13.050180958147799 + idx / 0.293946557709426 );
		// (freq + 44.51401880248667 ) / 77.50771033219084 = Math.pow( 2.8864295611172226, 13.050180958147799 + idx / 0.293946557709426 );
		// getBaseLog( (freq + 44.51401880248667 ) / 77.50771033219084, 2.8864295611172226)  = 13.050180958147799 + idx / 0.293946557709426;
		// ( getBaseLog( (freq + 44.51401880248667 ) / 77.50771033219084, 2.8864295611172226) - 13.050180958147799 ) * 0.293946557709426 = idx;
		//var val = ( this.getBaseLog( (freq + 44.51401880248667 ) / 77.50771033219084, 2.8864295611172226 ) - 0.293946557709426 ) * 13.050180958147799;
		val = Math.max( 0, Math.min( 63, Math.round( val ) ) );
		return val;
	}
	
}
