This package exposes a CLI tool to upload CDK emitted assets to S3. It is intended to be used in automated deployment environments to publish the CDK assets before deploying the Cloud Formation Stack.

_**Warning:** This package currently DOES NOT support Docker assets_

## Usage

### Installation

The package is available on [NPM](https://www.npmjs.com) and can be installed using your package manager of choice:

```bash
npm i -g @flit/publish-cdk-assets
```

```bash
pnpm add -g @flit/publish-cdk-assets
```

```bash
yarn global add @flit/publish-cdk-assets
```

### Basic Usage

_**Important:** Assets in nested cloud assembly manifest **ARE** included_

_**Important:** Ensure that the account running this command has write privileges for the S3 buckets the assets are published to_

#### Publish

The root command will publish the CDK assets listed in the `manifest.json` at the given path

```bash
pca ./path/to/manifest/
```

#### Region override

By default the current region is taken from the `AWS_REGION` environmental variable but can be changed using the `-r` option

```bash
pca ./path/to/manifest/ -r "eu-central-1"
```

#### List

The list function can be used for testing and debugging, to show what CDK assets the CLI would publish to S3 given the path to the manifest

```bash
pca ls ./path/to/manifest/
```
