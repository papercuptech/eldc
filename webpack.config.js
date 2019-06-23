const path = require('path');

const webpack = require('webpack');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');


module.exports = function(env, argv) {
	const isDev = argv.mode === 'development'
	const entry = {test: './src/test-node.ts'}

	const config = {
		performance: {hints: false},
		entry,
		mode: isDev ? 'development' : 'production',
		output: {
			path: path.resolve(__dirname, 'dist'),
			filename: '[name].js',
			publicPath: '/'
		},
		cache: true,
		devtool: isDev ? 'source-maps' : '',
		devServer: {
			historyApiFallback: true
		},
		module: {
			rules: [
				{
					test: /\.js$/,
					exclude: /node_modules/,
					loader: 'source-map-loader',
					enforce: 'pre'
				},
				{
					test: /\.(html|png)$/,
					loader: 'file-loader',
					query: {name: '[name].[ext]'}
				},
				{
					test: /\.(ts|tsx)?$/,
					loader: 'ts-loader',
					query: {transpileOnly: true},
					exclude: /node_modules/
				}
			]
		},
		resolve: {
			plugins: [new TsconfigPathsPlugin()],
			extensions: ['.ts', '.tsx', '.js', '.jsx']
		},
		plugins: [
			new webpack.ContextReplacementPlugin(/moment[\/\\]locale$/, /en/)
		]
	}

	return config
}
