var isNode = typeof process !== 'undefined' && process.versions && process.versions.node && typeof global !== 'undefined' && typeof window === 'undefined';
if (isNode) {
	process.once('message', function (code) {
		eval(JSON.parse(code).data);
	});
} else {
	self.onmessage = function (code) {
		eval(code.data);
	};
}