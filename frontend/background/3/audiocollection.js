"use strict";

/*
	Squee Powered!
*/

// 
// Not used ( yet )
//
var AudioCollection = function(  )
{
	// current buffer for next frame
	this.audioData = new AudioData();	
	this.audioDataMin = new AudioData();	
	this.audioDataMax = new AudioData();	
	this.audioDataCount = 0;
	
	// data from previous frame
	this.prevAudioData = new AudioData();
	this.prevAudioDataMin = new AudioData();
	this.prevAudioDataMax = new AudioData();
	
	// current frame data
	this.frameData = new AudioData();
	this.frameDataMin = new AudioData();
	this.frameDataMax = new AudioData();
	

	this.maxAverage = 1;
	this.maxHistory = [];
		
	this.smoothingFactor = 0;
	this.reverseAudioData = 0;
};

AudioCollection.prototype = 
{	
	hasData: function() {
		return this.audioDataCount > 0;
	},
	resetAudioData: function()
	{
		if( this.audioDataCount > 0 ) {
			this.prevAudioData.copyFrom( this.audioData );
			this.prevAudioDataMin.copyFrom( this.audioDataMin );
			this.prevAudioDataMax.copyFrom( this.audioDataMax );
		}
		else {
			this.prevAudioData.clear();
			this.prevAudioDataMin.clear();
			this.prevAudioDataMax.clear();
		}
		
		this.audioData.clear();
		this.audioDataCount = 0;
	},
	updateAudioData: function( audioData )
	{
		if( this.audioDataCount == 0 ) {
			this.audioData.copyFrom( audioData );
			this.audioDataMin.copyFrom( audioData );
			this.audioDataMax.copyFrom( audioData );
		}
		else {
			this.audioData.add( audioData );
			this.audioDataMin.copyMinFrom( audioData );
			this.audioDataMax.copyMaxFrom( audioData );
		}
		this.audioDataCount++;
	},
	updateFrameData: function()
	{
		if( this.audioDataCount > 0 ) {
			this.frameData.copyFrom( this.audioData );
			this.frameDataMin.copyFrom( this.audioDataMin );
			this.frameDataMax.copyFrom( this.audioDataMax );
			
			this.frameData.divide( this.audioDataCount ); // divide by total data we receives
			
			if( this.reverseAudioData ) {
				this.frameData.reverse();
				this.frameDataMin.reverse();
				this.frameDataMax.reverse();
			}
			if( this.smoothingFactor > 0 ) {
				this.frameData.smooth( this.smoothingFactor );
				this.frameDataMin.smooth( this.smoothingFactor );
				this.frameDataMax.smooth( this.smoothingFactor );
			} 
			
			this.resetAudioData();   // and reset.. this.audioData will now be a new instance 
		}
	},
	getFrameData: function()
	{
		this.updateFrameData();		
		return this.frameData;
	},
	getFrameDataMin: function()
	{
		this.updateFrameData();		
		return this.frameDataMin;
	},
	getFrameDataMax: function()
	{
		this.updateFrameData();		
		return this.frameDataMax;
	}
}
