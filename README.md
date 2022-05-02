# publish-cdk-assets

This package exposes a CLI tool for uploading CDK emitted assets to S3. It's intended to be used in automated deployment scenarios to publish the CDK assets before deploying the Cloud Formation stack.

_**Warning:** This package is EXPERIMENTAL and might undergo breaking changes_

_**Warning:** This package currently does not support Docker assets_

## Usage

### Installation

```bash
npm install publish-cdk-assets
```

### Basic Usage

The list function can be used for testing to show what CDK assets the CLI will be publish to S3 given the path to the manifest

```bash
pca ls ./path/to/manifest/
```

The root command will publish the CDK assets listed in the manifest.json at the given path

```bash
pca ./path/to/manifest/
```

_**Important:** Assets in nested cloud assembly manifest will be included_
