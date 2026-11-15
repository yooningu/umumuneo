
function getColor( val ) { return 'rgb(' + val.split(' ').map(function(c) {return Math.ceil(c * 255);}).join(',') + ')'; }
function getColorAsArray( val ) { return val.split(' ').map(function(c) {return Math.ceil(c * 255);}); }
function getSlider( val, min, max ) { return Math.max( min, Math.min( max, 1*val ) ); }
function getBool( val ) { return val ? true : false; }

function easeInOutQuad(t) { return t<.5 ? 2*t*t : -1+(4-2*t)*t };
function easeInOutCubic(t) { return t<.5 ? 4*t*t*t : (t-1)*(2*t-2)*(2*t-2)+1 }
function easeInOutQuart(t) { return t<.5 ? 8*t*t*t*t : 1-8*(--t)*t*t*t }


function rgbToHsl(r, g, b, factor){
	r /= factor, 
	g /= factor, 
	b /= factor;
	var max = Math.max(r, g, b), min = Math.min(r, g, b);
	var h, s, l = (max + min) / 2;

	if(max == min){
		h = s = 0; // achromatic
	}else{
		var d = max - min;
		s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
		switch(max){
			case r: h = (g - b) / d + (g < b ? 6 : 0); break;
			case g: h = (b - r) / d + 2; break;
			case b: h = (r - g) / d + 4; break;
		}
		h /= 6;
	}

	return [h, s, l];
}

function hslToRgb(h, s, l){
    var r, g, b;

    if(s == 0){
        r = g = b = l; // achromatic
    }else{
        var hue2rgb = function hue2rgb(p, q, t){
            if(t < 0) t += 1;
            if(t > 1) t -= 1;
            if(t < 1/6) return p + (q - p) * 6 * t;
            if(t < 1/2) return q;
            if(t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        }

        var q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        var p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function rgbToHsv (r, g, b, factor) {
    var rr, gg, bb,
        r = r / factor,
        g = g / factor,
        b = b / factor,
        h, s,
        v = Math.max(r, g, b),
        diff = v - Math.min(r, g, b),
        diffc = function(c){
            return (v - c) / 6 / diff + 1 / 2;
        };
    if (diff == 0) {
        h = s = 0;
    } else {
        s = diff / v;
        rr = diffc(r);
        gg = diffc(g);
        bb = diffc(b);

        if (r === v) {
            h = bb - gg;
        }else if (g === v) {
            h = (1 / 3) + rr - bb;
        }else if (b === v) {
            h = (2 / 3) + gg - rr;
        }
        if (h < 0) {
            h += 1;
        }else if (h > 1) {
            h -= 1;
        }
    }
    return [
        h, //Math.round(h * 360),
        s, //Math.round(s * 100),
        v  //Math.round(v * 100)
    ];
}

function hsvToRgb(h, s, v) {
  var r, g, b;

  var i = Math.floor(h * 6);
  var f = h * 6 - i;
  var p = v * (1 - s);
  var q = v * (1 - f * s);
  var t = v * (1 - (1 - f) * s);

  switch (i % 6) {
    case 0: r = v, g = t, b = p; break;
    case 1: r = q, g = v, b = p; break;
    case 2: r = p, g = v, b = t; break;
    case 3: r = p, g = q, b = v; break;
    case 4: r = t, g = p, b = v; break;
    case 5: r = v, g = p, b = q; break;
  }

  return [ Math.round(r * 255), Math.round(g * 255), Math.round(b * 255) ];
}


function cosInterpolate( v1, v2, perc )
{
  	var mu2 = (1-Math.cos(perc*Math.PI))/2;
    return(v1*(1-mu2)+v2*mu2);
}

function adjustAngle( deg )
{
	while( deg < 0 ) deg += 360;
	while( deg >= 360 ) deg -= 360;
	
	
	if( deg < 180 ) {
		deg /= 180;
		if( deg != 0 ) deg = Math.pow( deg, freqScaleAdjustment );
		deg *= 180;
	}
	else {
		deg = 360 - deg;
		deg /= 180;
		if( deg != 0 ) deg = Math.pow( deg, freqScaleAdjustment );
		deg *= 180;
		deg = 360 - deg;
	}
	return deg;
}

var scaleAnimValue = 0;
function adjustPerc( perc, scale )
{
	/*
	var scale = freqScaleAdjustment;
	if( freqScaleAdjustmentAnim )
	{
		var p = (performance.now() / 200) % 360;
		scaleAnimValue = 60 * Math.sin( p * Math.PI / 180 );
		if( scaleAnimValue < 0 ) {								
			scale = -( 1 +  scaleAnimValue / -100 );
		}
		else if( scaleAnimValue == 0 ) {								
			scale = 0;
		}
		else {
			scale = 1 + scaleAnimValue / 100;
		}
	}*/
	if( scale == 0 ) return perc;
	
	if( perc < 0.5 ) {
		perc /= 0.5;
		if( scale < 1 ) {
			perc = 1-Math.pow( 1-perc, -scale );
		}
		else {
			perc = Math.pow( perc, scale );
		}
		perc *= 0.5;
	}
	else {
		perc = 1 - perc;
		perc /= 0.5;
		if( scale < 1 ) {
			perc = 1-Math.pow( 1-perc, -scale );
		}
		else {
			perc = Math.pow( perc, scale );
		}
		perc *= 0.5;
		perc = 1 - perc;
	}
	return perc;
}

function ShapeList()
{
	this.defaultShapes = {
		'circle': shapeCircle,
		'heart': shapeHeart,
		'cannabis': shapeLeaf,
		'butterfly': shapeButterfly
	};
	this.shapes = [new shapePointList()];
	
	this.empty = function() {  this.shapes = []; }
	this.add = function(shape) { if( shape.getLength() > 5 ) { this.shapes.push( shape ); } }
	this.createShape = function(shapeName) { 
		if( this.defaultShapes.hasOwnProperty( shapeName ) ) {
			var s = new this.defaultShapes[ shapeName ](); 
			var s2 = new shapePointList([],false);
			s.prepare( 200 );
			s2.setDataFromShape(s);
			this.add( s2 ); 
			return s2; 
		}

		return null;
	}
	
	this.render = function( context, color, interpolationSteps, interpolationBalanced, renderMethod )
	{
		for( var i = 0; i < this.shapes.length; i++)
		{
			if( this.shapes[i].hasBeenRemoved ) {
				this.shapes.splice(i,1);
				i--;
				this.updateAutosave();
				continue;
			}
			renderAudioFrameToShape( context, color, frame2, this.shapes[i], interpolationSteps, interpolationBalanced, renderMethod );
		}
	}
	
	this.resetPreperation = function()
	{
		for( var i = 0; i < this.shapes.length; i++)
		{
			this.shapes[i].prevPointCount = -1;
		}
	}
	
	this.updateAutosave = function( )
	{
		storage.saveShapeList( 'as_autosave', this );
	}
	
	this.importJson = function( json )
	{
		//console.log( json );
		var obj = JSON.parse( json );
		if( typeof obj == 'object' && obj ) {
			this.empty();
			//console.log( obj.length );
			//console.log( 'importJson2 ' + obj.length );
			for( var i = 0; i < obj.length; i++ ) 
			{
				var s = new shapePointList([],false);
				s.setData( obj[ i ] );
				this.add( s ); 
			}
		}
	}
	
	this.exportJson = function()
	{
		var arr = [];
		//console.log( this.shapes.length );
		for( var i = 0; i < this.shapes.length; i++ )
		{
			arr.push( this.shapes[i].points );	
		}
		return JSON.stringify( arr, function(key, value) {
			        // limit precision of floats
			        if (typeof value === 'number') {
			            return parseFloat(value.toFixed(2));
			        }
			        return value;
			    } );
	}
	
	this.getShapesForPoint = function( point )
	{
		var arr = [];
		for( var i = 0; i < this.shapes.length; i++ )
		{
			if( this.shapes[i].isPointInside( point ) ) {
				arr.push( this.shapes[i] );	
			}
		}
		return arr;
	}
}

function shapePointList( points, smooth )
{
	this.points = points || [];	
	this.dontSmooth = !(smooth || false);
	this.lengths = [];
	this.totalLength = 0;
	this.centerDeg = 0;
	this.height = 100;
	
	this.cx = 0;
	this.cy = 0;
	
	this.isSelected = false;
	this.isHighlighted = false;
	this.hasBeenRemoved = false;
	
	
	if( this.points.length < 1 ) {
		var shape = new shapeHeart();
		
		for( var i = 0; i <= 1000; i++ )
		{
			var pt = shape.getPositionFor( i/1000, 0 );
			this.points.push( pt[0] );
		}
	}
	
	this.points2 = [];
	
	this.prevPointCount = -1;
	
	this.setDataFromShape = function( shape )
	{
		this.points = [];
		this.prevPointCount = -1;
		this.lengths = [];
		this.points2 = [];
		
		for( var i = 0; i <= 1000; i++ )
		{
			var pt = shape.getPositionFor( i/1000, 0 );
			this.points.push( pt[0] );
		}
		
		if( !this.dontSmooth ) {
			for( var i = 0; i < this.points.length-1; i++ )
			{
				xx = this.points[i][0] - this.points[i+1][0];
				yy = this.points[i][1] - this.points[i+1][1];
				var len = ( xx *xx + yy*yy );
				if( len < 100 ) {
					this.points.splice(i+1,1);
					i--;
				}
			}
			
			for( var i = 0; i < this.points.length-2; i++ )
			{
				var pt1 = this.points[i];
				var pt2 = this.points[i+1];
				var pt3 = this.points[i+2];
				
				var p1 = i == 0 ? 1/4 : 1 / 3;
				var p2 = i == this.points.length-3 ? 1/4 : 1/3;
				
				var ptn1 = [ pt2[0] + ( pt1[0] - pt2[0]) * p1, pt2[1] + ( pt1[1] - pt2[1]) * p1 ];
				var ptn2 = [ pt2[0] + ( pt3[0] - pt2[0]) * p2, pt2[1] + ( pt3[1] - pt2[1]) * p2 ];
				
				
				this.points.splice(i+1,1,ptn2);
				this.points.splice(i+1,0,ptn1);
				i++;
			}
			
			//console.log( this.points );
		}
	}
	
	this.setData = function( points )
	{
		this.points = points;
		this.prevPointCount = -1;
		this.lengths = [];
		this.points2 = [];
		if( !this.dontSmooth ) {
			for( var i = 0; i < this.points.length-1; i++ )
			{
				xx = this.points[i][0] - this.points[i+1][0];
				yy = this.points[i][1] - this.points[i+1][1];
				var len = ( xx *xx + yy*yy );
				if( len < 100 ) {
					this.points.splice(i+1,1);
					i--;
				}
			}
			
			for( var i = 0; i < this.points.length-2; i++ )
			{
				var pt1 = this.points[i];
				var pt2 = this.points[i+1];
				var pt3 = this.points[i+2];
				
				var p1 = i == 0 ? 1/4 : 1 / 3;
				var p2 = i == this.points.length-3 ? 1/4 : 1/3;
				
				var ptn1 = [ pt2[0] + ( pt1[0] - pt2[0]) * p1, pt2[1] + ( pt1[1] - pt2[1]) * p1 ];
				var ptn2 = [ pt2[0] + ( pt3[0] - pt2[0]) * p2, pt2[1] + ( pt3[1] - pt2[1]) * p2 ];
				
				
				this.points.splice(i+1,1,ptn2);
				this.points.splice(i+1,0,ptn1);
				i++;
			}
			
			//console.log( this.points );
		}
		
	}
	
	this.getLength = function()
	{
		var totalLen = 0;
		for( var i = 0; i < this.points.length-1; i++ )
		{
			xx = this.points[i][0] - this.points[i+1][0];
			yy = this.points[i][1] - this.points[i+1][1];
			totalLen += Math.sqrt( xx *xx + yy*yy );
		}
		
		this.totalLength = totalLen;
		return totalLen;
	}
	
	this.prepare = function(totalPoints, scaleAdjustment )
	{
		if( totalPoints == this.prevPointCount ) return;
		scaleAdjustment = scaleAdjustment || 0;
		
		//console.log( 'prepare(' + totalPoints + ')' );
		var totalLen = 0;
		var xx, yy, len;
		
		var cx = 0, cy = 0;
		
		this.lengths = [];
		this.points2 = [];
		
		if( this.points.length < 2 ) {			
			 return;
		}
		
		cx += this.points[0][0];
		cy += this.points[0][1];
		for( var i = 0; i < this.points.length-1; i++ )
		{
			xx = this.points[i][0] - this.points[i+1][0];
			yy = this.points[i][1] - this.points[i+1][1];
			this.lengths[ i ] = len = Math.sqrt( xx *xx + yy*yy );
			totalLen += len;
			
			cx += this.points[i+1][0];
			cy += this.points[i+1][1];
		}
		
		this.totalLength = totalLen;
		
		this.cx = cx / this.points.length;
		this.cy = cy / this.points.length;
		
		
		var lenPerPoint = totalLen / ( totalPoints - 1 );
		
		var parseLen = 0;
		var nextLen = 0;
		var nextPoint = 0;
		for( var i = 0; i < this.points.length -1; i++ )
		{
			var segLen = this.lengths[ i ];
			while( nextLen >= parseLen && nextLen < segLen + parseLen )
			{
				var p = ( nextLen - parseLen ) / ( segLen );
				var x = this.points[i][0] + ( this.points[i+1][0] - this.points[i][0] ) * p;
				var y = this.points[i][1] + ( this.points[i+1][1] - this.points[i][1] ) * p;
				
				var dx0, dy0, dx1, dy1, dx2, dy2, l;
				
				
				dx1 = this.points[i+1][1] - this.points[i][1];
				dy1 = -(this.points[i+1][0] - this.points[i][0]);
				l = Math.sqrt( dx1*dx1 + dy1*dy1 );
				dx1 /= l; dy1 /= l;
				
				if( p < 0.5 ) {
					if( i > 0 ) {
						dx0 = this.points[i][1] - this.points[i-1][1];
						dy0 = -(this.points[i][0] - this.points[i-1][0]);
						l = Math.sqrt( dx0*dx0 + dy0*dy0 );
						dx0 /= l; dy0 /= l;
						
						//var f1 = 
						
						dx1 = dx0 * ( 0.5 - p ) + dx1 * (p+0.5);
						dy1 = dy0 * ( 0.5 - p ) + dy1 * (p+0.5);
					}
					else {
						
					}
				}
				
				
				if( p >= 0.5 ) {
					if( i < this.points.length-2 ) {
						dx2 = this.points[i+2][1] - this.points[i+1][1];
						dy2 = -(this.points[i+2][0] - this.points[i+1][0]);
						l = Math.sqrt( dx2*dx2 + dy2*dy2 );
						dx2 /= l; dy2 /= l;
						
						dx1 = dx2 * ( p - 0.5 ) + dx1 * (1 - p + 0.5);
						dy1 = dy2 * ( p - 0.5 ) + dy1 * (1 - p + 0.5);
					}
					else {
						
					}
				}
				
				
				this.points2.push( [x,y,dx1,dy1] );
				
				nextPoint++;
				nextLen = totalLen * adjustPerc( nextPoint / ( totalPoints - 1 ), scaleAdjustment );
			}
			parseLen += segLen;
		}
		
		if( this.points2.length < totalPoints ) {
			// for rare case it actually end up perfectly at 100% and the final point does not get made :)
			this.points2.push( [this.points[this.points.length -1][0],this.points[this.points.length -1][1],dx1,dy1] );
		}
		
		this.prevPointCount = totalPoints;
		//console.log( 'prepare Finished(' + this.points2.length + ')' );
		//console.log( this.points2 );
	}
	
	this.getPositionFor = function( perc, val )
	{
		if( this.points2.length < 2 ) return [ [0,0], [0,0] ];
		var idx = Math.round( perc * (this.points2.length-1) );
	
		var pt = this.points2[ idx ];
		
		var x = pt[0];
		var y = pt[1]
		
		var pt0;
		var pt1;
		if( ( heightDir & 1 ) != 0 ) {
			pt0 = [ pt[0] - pt[2] * this.height * val, pt[1] - pt[3] * this.height * val ];
		}
		else {
			pt0 = [ pt[0], pt[1] ];
		}
		
		if( ( heightDir & 2 ) != 0 ) {
			pt1 = [ pt[0] + pt[2] * this.height * val, pt[1] + pt[3] * this.height * val ];
		}
		else {
			pt1 = [ pt[0], pt[1] ];
		}
		
		return [ pt0, pt1 ];
	}
	
	this.isPointInside = function(point) 
	{
	    // ray-casting algorithm based on
	    // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
		var cx = width / 2;
		var cy = height / 2;

		var points = [];
		var innerPoints = [];
		var outerPoints = [];
		for( var i = 0; i <= 100; i++ ) {
			var pos = this.getPositionFor( i / 100, 0.1 );
			inner = pos[ 0 ];
			outer = pos[ 1 ];
			inner[ 0 ] *= radiusFactor;
			inner[ 1 ] *= radiusFactor;
			outer[ 0 ] *= radiusFactor;
			outer[ 1 ] *= radiusFactor;
			inner[ 0 ] += cx;
			inner[ 1 ] += cy;
			outer[ 0 ] += cx;
			outer[ 1 ] += cy;
			innerPoints.push( inner );
			outerPoints.push( outer );
		}
		
		var l = outerPoints.length;
		for( var i = 0; i < l; i++ )
		{
			points.push( outerPoints[i] );
		}
		for( var i = l-1; i >= 0; i-- )
		{
			points.push( innerPoints[i] );
		}
		
		var vs = points;
				
	    var x = point[0], y = point[1];

	    var inside = false;
	    for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
	        var xi = vs[i][0], yi = vs[i][1];
	        var xj = vs[j][0], yj = vs[j][1];

	        var intersect = ((yi > y) != (yj > y))
	            && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
	        if (intersect) inside = !inside;
	    }

	    return inside;
	};
	
	this.translate = function(x,y)
	{
		for( var i = 0; i < this.points.length; i++ )
		{
			this.points[i][0] += x;
			this.points[i][1] += y;	
		}
		this.prevPointCount = -1;
	}
	
	this.rotate = function(r)
	{
		for( var i = 0; i < this.points.length; i++ )
		{
			var x = this.points[i][0] - this.cx;
			var y = this.points[i][1] - this.cy;	
			
			var pt = this.rotatePoint( x, y, r );
			
			this.points[i][0] = pt[0] + this.cx;
			this.points[i][1] = pt[1] + this.cy;
			
		}
		
		this.prevPointCount = -1;
	}
	
	this.scale = function(x,y)
	{
		for( var i = 0; i < this.points.length; i++ )
		{
			this.points[i][0] =  (this.points[i][0]-this.cx ) * x + this.cx;
			this.points[i][1] =  (this.points[i][1]-this.cy ) * y + this.cy;
		}
		this.prevPointCount = -1;
	}
	
	this.rotatePoint = function( x, y, rad )
	{
		
		var x2 = x * Math.cos(rad) - y * Math.sin( rad );
		var y2 = y * Math.cos(rad) + x * Math.sin( rad );
		return [x2,y2];
	}
}
	
function shiftVal( i, shift, min, max )
{
	var d = max - min;
	i -= min;
	i += shift;
	i += d * 10000;
	i = i % d;
	i += min;
	i = Math.floor(i);
	return i;
}


/**
 * renders an audioFrame obect 
 *
 * @param ctx 2d canvas context
 * @param color strokeStyle value
 * @param frame AudioFrame object
 * @param offset horizontal offset in degrees for the "vertical" lines
 *
 **/

function renderAudioFrameToShape( ctx, color, frame, shape, interpolation, interpolationBalanced, renderMethod )
{
	timer.start( 'render shape' );
	timer.start( 'calculate shape' );
	var cx = width / 2;
	var cy = height / 2;
	
	var audioArray = frame.audioDataResult.left;
	
	var highlight = shape.isHighlighted || shape.isSelected;
	if( highlight ) { renderMethod = '3'; }
	
	var minAudioIdx = 0;
	var maxAudioIdx = 63;
	var totalValues = maxAudioIdx + 1 - minAudioIdx;
	
	var interpolationSteps = interpolation || 1;	
	
	if( interpolationBalanced && shape.totalLength ) {
		var pointsWanted =  shape.totalLength * radiusFactor * interpolationSteps / 40;
		//pointsWanted = Math.pow(2, Math.ceil(Math.log(pointsWanted)/Math.log(2)));
		if( pointsWanted < totalValues )
		{
			if( pointsWanted < 4 ) pointsWanted = 4;
			var step = totalValues / pointsWanted;
			var newAudioArray = new AudioArray();
			for( var i = 0; i <= totalValues; i+= step )
			{
				var v = audioArray.max( Math.floor(i), Math.ceil( i + step - 1 ) );
				newAudioArray.data[ Math.round( i / step ) ] = v;
			}
			audioArray = newAudioArray;
			minAudioIdx = 0;
			maxAudioIdx = Math.floor(pointsWanted-1);
			totalValues = Math.floor( maxAudioIdx + 1 - minAudioIdx );
			interpolationSteps = 1;
		}
		else if( pointsWanted > totalValues )
		{
			interpolationSteps = Math.round(pointsWanted / totalValues);
		}
		/*
		var altInterpolationSteps =  shape.totalLength * radiusFactor / 20 / totalValues;
		if( altInterpolationSteps < 1 ) altInterpolationSteps = 1 + -1 / altInterpolationSteps;
		altInterpolationSteps -= 1;
		interpolationSteps += Math.min(10, Math.max(1, altInterpolationSteps + interpolationSteps ) );*/
		//console.log( ( shape.totalLength * radiusFactor ) + ' : ' + pointsWanted + ':' + interpolationSteps );
	}
	
	var totalSteps = ((totalValues) * 2 - 1) +  ((totalValues) * 2 - 2)* (interpolationSteps-1) ;  // -1 is for shared item
	//console.log( 'totalSteps ' + totalSteps );
	
	// do any preperation calculations needed
	if( freqScaleAdjustmentAnim ) {
		shape.prevPointCount = -1;
	}
	
	var scale = freqScaleAdjustment;
	if( freqScaleAdjustmentAnim )
	{
		var p = (performance.now() / 200) % 360;
		scaleAnimValue = 60 * Math.sin( p * Math.PI / 180 );
		if( scaleAnimValue < 0 ) {								
			scale = -( 1 +  scaleAnimValue / -100 );
		}
		else if( scaleAnimValue == 0 ) {								
			scale = 0;
		}
		else {
			scale = 1 + scaleAnimValue / 100;
		}
	}
	
	shape.prepare( totalSteps, scale );
	
	var innerPoints = [];
	var outerPoints = [];
	
	// start building up point list
	var v, v2 = null;
	var inner, outer;
	for( var i = maxAudioIdx; i >= minAudioIdx; i-- )
	{
		v = highlight ? 0.05 : audioArray.data[ i ]; //shiftVal(i, frameCount/10, minAudioIdx, maxAudioIdx+1 ) ];
		if( v2 !== null ) {
			for( var j = 1; j < interpolationSteps; j++ ) {
				var k = j / interpolationSteps;
				var v3 = cosInterpolate( v, v2, 1-k );   
				
				//console.log( ( ( (maxAudioIdx-i-1) - minAudioIdx ) * interpolationSteps + j ) +' //  '+ (totalSteps-1) + ' = ' + (( ( (maxAudioIdx-i-1) - minAudioIdx ) * interpolationSteps + j ) / (totalSteps-1)) )		
				var pos = shape.getPositionFor( ( ( ( (maxAudioIdx-i-1) - minAudioIdx ) * interpolationSteps + j ) / (totalSteps-1) ), v3 );
				inner = pos[ 0 ];
				outer = pos[ 1 ];
				inner[ 0 ] *= radiusFactor;
				inner[ 1 ] *= radiusFactor;
				outer[ 0 ] *= radiusFactor;
				outer[ 1 ] *= radiusFactor;
				inner[ 0 ] += cx;
				inner[ 1 ] += cy;
				outer[ 0 ] += cx;
				outer[ 1 ] += cy;
				//inner[ 0 ] = Math.round( inner[0] );
				//inner[ 1 ] = Math.round( inner[1] );
				//outer[ 0 ] = Math.round( outer[0] );
				//outer[ 1 ] = Math.round( outer[1] );
				innerPoints.push( inner );
				outerPoints.push( outer );
			}		
		}

		//console.log( ( ( (maxAudioIdx-i) - minAudioIdx ) * interpolationSteps ) +' /  '+ (totalSteps-1) + ' = ' + (( ( (maxAudioIdx-i) - minAudioIdx ) * interpolationSteps ) / (totalSteps-1)) )		
		var pos = shape.getPositionFor( ( ( ( (maxAudioIdx-i) - minAudioIdx ) * interpolationSteps ) / (totalSteps-1) ), v );
		//console.log( i + " " + ( ( ( (maxAudioIdx-i) - minAudioIdx ) * interpolationSteps ) / (totalSteps-1) ) + ' ' + v + ' ' + pos );
		inner = pos[ 0 ];
		outer = pos[ 1 ];
		inner[ 0 ] *= radiusFactor;
		inner[ 1 ] *= radiusFactor;
		outer[ 0 ] *= radiusFactor;
		outer[ 1 ] *= radiusFactor;
		inner[ 0 ] += cx;
		inner[ 1 ] += cy;
		outer[ 0 ] += cx;
		outer[ 1 ] += cy;
		//inner[ 0 ] = Math.round( inner[0] );
		//inner[ 1 ] = Math.round( inner[1] );
		//outer[ 0 ] = Math.round( outer[0] );
		//outer[ 1 ] = Math.round( outer[1] );
		innerPoints.push( inner );
		outerPoints.push( outer );
		v2 = v;
	}
	
	v2 = null;
	for( var i = minAudioIdx; i <= maxAudioIdx; i++ )
	{
		v = highlight ? 0.05 : audioArray.data[ i ]; // shiftVal(i, frameCount/10, minAudioIdx, maxAudioIdx+1 ) ];
		if( v2 !== null ) {
			for( var j = 1; j < interpolationSteps; j++ ) {
				var k = j / interpolationSteps;
				var v3 = cosInterpolate( v, v2, 1 - k );   
				
				//console.log( ( ( totalValues-1 + i - minAudioIdx - 1 ) * interpolationSteps + j  ) + ' // ' + (totalSteps) + ' = ' + ( ( ( totalValues-1 + i - minAudioIdx - 1 ) * interpolationSteps + j  ) / (totalSteps-1) ));
				var pos = shape.getPositionFor( ( ( ( totalValues-1 + i - minAudioIdx - 1 ) * interpolationSteps + j  ) / (totalSteps-1) ), v3 );
				inner = pos[ 0 ];
				outer = pos[ 1 ];
				inner[ 0 ] *= radiusFactor;
				inner[ 1 ] *= radiusFactor;
				outer[ 0 ] *= radiusFactor;
				outer[ 1 ] *= radiusFactor;
				inner[ 0 ] += cx;
				inner[ 1 ] += cy;
				outer[ 0 ] += cx;
				outer[ 1 ] += cy;
				//inner[ 0 ] = Math.round( inner[0] );
				//inner[ 1 ] = Math.round( inner[1] );
				//outer[ 0 ] = Math.round( outer[0] );
				//outer[ 1 ] = Math.round( outer[1] );
				innerPoints.push( inner );
				outerPoints.push( outer );
			}
		}
		//console.log( (( totalValues - 1 + i - minAudioIdx) * interpolationSteps ) + ' /  ' + (totalSteps-1) + ' ' + ( ( totalValues  -1 + i - minAudioIdx ) * interpolationSteps ) / (totalSteps-1) );
		var pos = shape.getPositionFor( ( ( ( totalValues  - 1  + i - minAudioIdx ) * interpolationSteps ) / (totalSteps-1) ), v );
		inner = pos[ 0 ];
		outer = pos[ 1 ];
		inner[ 0 ] *= radiusFactor;
		inner[ 1 ] *= radiusFactor;
		outer[ 0 ] *= radiusFactor;
		outer[ 1 ] *= radiusFactor;
		inner[ 0 ] += cx;
		inner[ 1 ] += cy;
		outer[ 0 ] += cx;
		outer[ 1 ] += cy;
		//inner[ 0 ] = Math.round( inner[0] );
		//inner[ 1 ] = Math.round( inner[1] );
		//outer[ 0 ] = Math.round( outer[0] );
		//outer[ 1 ] = Math.round( outer[1] );
		innerPoints.push( inner );
		outerPoints.push( outer );
		v2 = v;
	}
	timer.stop( 'calculate shape' );

	// render it all :)	
	var l = outerPoints.length;
	ctx.strokeStyle = color;
	ctx.fillStyle = color;
	if( (renderMethod & 1) > 0 ) {
		timer.start( 'lines shape' );
		ctx.beginPath();
		ctx.lineWidth = 1;
		for( var i = 0; i < Math.floor( l/2 ); i+=1  )
		{
			var len = Math.pow( outerPoints[i][0]-innerPoints[i][0], 2 ) +Math.pow( outerPoints[i][1]-innerPoints[i][1], 2 );
			if( len > heightCutoff ) {
				ctx.moveTo( innerPoints[i][0], innerPoints[i][1] );
				ctx.lineTo( outerPoints[i][0], outerPoints[i][1] );
			}
		}
		for( var i = Math.floor( l/2 ); i < l; i+=1 )
		{
			var len = Math.pow( outerPoints[i][0]-innerPoints[i][0], 2 ) +Math.pow( outerPoints[i][1]-innerPoints[i][1], 2 );
			if( len > heightCutoff ) {
				ctx.moveTo( innerPoints[i][0], innerPoints[i][1] );
				ctx.lineTo( outerPoints[i][0], outerPoints[i][1] );
			}
		}
		ctx.stroke();
		timer.stop( 'lines shape' );
	}
	
	if( (renderMethod & 6) > 0 ) {
		timer.start( 'outline shape' );
		ctx.beginPath();
		ctx.moveTo( (outerPoints[0][0] ), (outerPoints[0][1] ) );
		for( var i = 1; i < l; i++ )
		{	
			if( i%2 == 1 ) 
				ctx.lineTo( (innerPoints[i][0] ), (innerPoints[i][1] ));
			else 
				ctx.lineTo( (outerPoints[i][0] ), (outerPoints[i][1] ) );
		}
		for( var i = l-1; i >= 0; i-- )
		{
			if( i%2 == 0 ) 
				ctx.lineTo( (innerPoints[i][0] ), (innerPoints[i][1] ));
			else 
				ctx.lineTo( (outerPoints[i][0] ), (outerPoints[i][1] ) );
		}
		ctx.lineTo( (outerPoints[0][0] ), (outerPoints[0][1] ) );
		ctx.beginPath();
		ctx.moveTo( (outerPoints[0][0] ), (outerPoints[0][1] ) );
		for( var i = 1; i < l; i++ )
		{
			ctx.lineTo( (outerPoints[i][0] ), (outerPoints[i][1] ) );
		}
		for( var i = l-1; i >= 0; i-- )
		{
			ctx.lineTo( (innerPoints[i][0] ), (innerPoints[i][1] ));
		}
		ctx.lineTo( (outerPoints[0][0] ), (outerPoints[0][1] ) );
		if( (renderMethod & 2) > 0 ) { ctx.stroke (); }
		if( (renderMethod & 4) > 0 ) { ctx.fill (); }
		timer.stop( 'outline shape' );
	}
	
	if( (renderMethod & 8) > 0 ) {
		timer.start( 'outline shape' );
		ctx.beginPath();
		ctx.moveTo( (outerPoints[0][0] ), (outerPoints[0][1] ) );
		for( var i = 1; i < l; i++ )
		{	
			if( i%2 == 1 ) 
				ctx.lineTo( (innerPoints[i][0] ), (innerPoints[i][1] ));
			else 
				ctx.lineTo( (outerPoints[i][0] ), (outerPoints[i][1] ) );
		}
		for( var i = l-1; i >= 0; i-- )
		{
			if( i%2 == 0 ) 
				ctx.lineTo( (innerPoints[i][0] ), (innerPoints[i][1] ));
			else 
				ctx.lineTo( (outerPoints[i][0] ), (outerPoints[i][1] ) );
		}
		ctx.lineTo( (outerPoints[0][0] ), (outerPoints[0][1] ) );
		if( (renderMethod & 8) > 0 ) { ctx.stroke (); }
		timer.stop( 'outline shape' );
	}
	
	
	//console.log( outerPoints );
	timer.stop( 'render shape' );
	return;
	
}
	