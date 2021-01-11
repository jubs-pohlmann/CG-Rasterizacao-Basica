(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define(['exports'], factory) :
	(global = global || self, factory(global.BasicRenderer = {}));
}(this, (function (exports) { 'use strict';


        /* ------------------------------------------------------------ */
    
    // https://www.algorithms-and-technologies.com/point_in_polygon/javascript     
    function inside(  x, y, primitive  ) {
        
        let odd = false;
        for (let i = 0, j = primitive.vertices.length - 1; i < primitive.vertices.length; i++) {
            if (((primitive.vertices[i][1] > y) !== (primitive.vertices[j][1] > y)) 
                && (x < ((primitive.vertices[j][0] - primitive.vertices[i][0]) * (y - primitive.vertices[i][1]) / (primitive.vertices[j][1] - primitive.vertices[i][1]) + primitive.vertices[i][0]))) {
                odd = !odd;
            }
            j = i;
        }
        return odd;
    }

    function circleTriangulation(primitive){
        primitive.vertices = [];
        let R = primitive.radius;
        let angle = 3000/(Math.PI*R);
        let quantSlices = Math.floor(360/angle); //garantindo fatias completas
        angle = 360/quantSlices;
        for(let i=0; i < quantSlices; i++){
            primitive.vertices.push(
                [Math.cos(angle*i)*R + primitive.center[0], Math.sin(angle*i)*R + primitive.center[1]]
            );
        }
        return primitive;
    }

    function boundingBox(primitive){
        let box;
        if( primitive.shape == 'circle' ){
            if ( primitive.hasOwnProperty('xform') ) {
                let circleMatrix = [
                    [primitive.center[0] - primitive.radius, 0],
                    [primitive.center[0] + primitive.radius, 0],
                    [0, primitive.center[1] - primitive.radius],
                    [0, primitive.center[1] + primitive.radius]
                ];
                let boxMatrix = multiplyMatrices(circleMatrix, primitive.xform);
                box = {
                    x_min: boxMatrix[0][0],
                    x_max: boxMatrix[1][0],
                    y_min: boxMatrix[2][1],
                    y_max: boxMatrix[3][1]
                }
            } else {
                box = {
                    x_min: primitive.center[0] - primitive.radius,
                    x_max: primitive.center[0] + primitive.radius ,
                    y_min: primitive.center[1] - primitive.radius,
                    y_max: primitive.center[1] + primitive.radius
                }
            }       
        } else {
            box = {
                x_min: primitive.vertices[0][0],
                y_min: primitive.vertices[0][1],
                x_max: 0,
                y_max: 0
            }
            primitive.vertices.forEach(element => {
                if( element[0] > box.x_max ) box.x_max = element[0];
                if( element[1] > box.y_max ) box.y_max = element[1];
                
                if( element[0] < box.x_min ) box.x_min = element[0];
                if( element[1] < box.y_min ) box.y_min = element[1];
            });
        } 
        return box;
    }

    function multiplyMatrices(matrix_1, matrix_2){
        let resulting_matrix = [];
        for (let i = 0; i < matrix_1.length; i++) {
            matrix_1[i].push(1); //coordenadas homogeneas 2d->3d
            resulting_matrix.push([]);
            for (let j = 0; j < matrix_2.length; j++) {
                var newValue = 0;
                for (let k = 0; k < matrix_1[0].length; k++) {
                    newValue += matrix_1[i][k]*matrix_2[k][j];
                }
                resulting_matrix[i][j] = newValue;
            }
        }
        return resulting_matrix;
    }

    function transform(primitive){
        primitive.vertices = multiplyMatrices(primitive.vertices, primitive.xform);
        return primitive;  
    }
    
    function Screen( width, height, scene ) {
        this.width = width;
        this.height = height;
        this.scene = this.preprocess(scene);   
        this.createImage(); 
    }

    Object.assign( Screen.prototype, {
            preprocess: function(scene) {
                // Possible preprocessing with scene primitives, for now we don't change anything
                // You may define bounding boxes, convert shapes, etc
                var preprop_scene = [];
                for( var primitive of scene ) {  
                    // do some processing
                    // for now, only copies each primitive to a new list
                    preprop_scene.push( primitive );
                }
                return preprop_scene;
            },

            createImage: function() {
                this.image = nj.ones([this.height, this.width, 3]).multiply(255);
            },

            rasterize: function() {
                var color;
                // In this loop, the image attribute must be updated after the rasterization procedure.
                for( var scenePrimitive of this.scene ) {  
                    if ( scenePrimitive.shape == 'circle') var primitive = circleTriangulation(scenePrimitive);
                    else var primitive = scenePrimitive;
                    if ( primitive.hasOwnProperty('xform') ) primitive = transform(primitive);
                    
                    let forBounds = boundingBox(primitive); 

                    // Loop through all pixels
                    for (var i = forBounds.x_min; i < forBounds.x_max; i++) {
                        var x = i + 0.5;
                        for( var j = forBounds.y_min; j < forBounds.y_max; j++) {
                            var y = j + 0.5;
                            // First, we check if the pixel center is inside the primitive 
                            if ( inside( x, y, primitive ) ) {
                                // only solid colors for now
                                color = nj.array(primitive.color);
                                this.set_pixel( i, this.height - (j + 1), color );
                            }
                        }
                    }
                }
            },

            set_pixel: function( i, j, colorarr ) {
                // We assume that every shape has solid color
                this.image.set(j, i, 0, colorarr.get(0));
                this.image.set(j, i, 1, colorarr.get(1));
                this.image.set(j, i, 2, colorarr.get(2));
            },

            update: function () {
                // Loading HTML element
                var $image = document.getElementById('raster_image');
                $image.width = this.width; $image.height = this.height;

                // Saving the image
                nj.images.save( this.image, $image );
            }
        }
    );

    exports.Screen = Screen;
    
})));

