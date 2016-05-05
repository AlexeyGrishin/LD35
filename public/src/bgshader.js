let {BackgroundShader} = require('./facets');

let VertShader = `
attribute vec3 position;
void main()
{
    gl_Position = vec4(position, 1.0);
}
`;

var aLoc = [];

exports.BackgroundShader = {
    init() {
        this.canvas = document.getElementById("gjs-background-canvas");
        this.ctx = this.canvas.getContext("webgl") || this.canvas.getContext("experimental-webgl");
        this.passed = 0;
        var gl = this.ctx;
        var p = gl.createProgram();
        var vs = gl.createShader(gl.VERTEX_SHADER);
        var fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(vs, VertShader);
        gl.shaderSource(fs, BackgroundShader);
        gl.compileShader(vs);
        gl.compileShader(fs);
        var compilationLog = gl.getShaderInfoLog(fs);
        console.log('Shader compiler log: ' + compilationLog);
        gl.attachShader(p, vs);
        gl.attachShader(p, fs);
        gl.linkProgram(p);
        gl.useProgram(p);
        aLoc[0] = gl.getAttribLocation(p, "position");
        gl.enableVertexAttribArray(aLoc[0]);

        var data = [
            -1.0, 1.0, 0.0, // v0
            1.0, 1.0, 0.0, // v1
            -1.0,-1.0, 0.0, // v2
            1.0,-1.0, 0.0  // v3
        ];

        gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
        gl.vertexAttribPointer(aLoc[0], 3, gl.FLOAT, false, 0, 0);
        this.p = p;

    },

    tick(ms) {
        this.passed += ms;
        var gl = this.ctx;
        gl.uniform1f(gl.getUniformLocation(this.p, "time"), this.passed/1000);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.flush();
    },

    draw() {

    }
};



function draw() {
    var data = [
        -1.0, 1.0, 0.0, // v0
        1.0, 1.0, 0.0, // v1
        -1.0,-1.0, 0.0, // v2
        1.0,-1.0, 0.0  // v3
    ];

    /*var color = [
     1.0, 0.0, 0.0, 1.0, // v0
     0.0, 1.0, 0.0, 1.0, // v1
     0.0, 0.0, 1.0, 1.0, // v2
     1.0, 1.0, 0.0, 1.0  // v3
     ];*/

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);
    gl.vertexAttribPointer(aLoc[0], 3, gl.FLOAT, false, 0, 0);

    //gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    //gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(color), gl.STATIC_DRAW);
    //gl.vertexAttribPointer(aLoc[1], 4, gl.FLOAT, false, 0, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    //gl.drawArrays(gl.POINTS, 0, 4);
    gl.flush();
}
