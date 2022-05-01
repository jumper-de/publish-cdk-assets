#!/usr/bin/env node
const path = require("path");
const fs = require("fs");

const { Manifest } = require("aws-cdk-lib/cloud-assembly-schema");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const {
  STSClient,
  AssumeRoleCommand,
  getDefaultRoleAssumerWithWebIdentity,
} = require("@aws-sdk/client-sts");
const { fromTemporaryCredentials } = require("@aws-sdk/credential-providers");
const { zip } = require("zip-a-folder");

import { getNestedAssets } from "./../src/get-nested-assets";

require("yargs")
  .command(
    "* <manifest>",
    "Upload CDK assets listed in the manifest",
    {
      r: {
        alias: ["region"],
        type: "string",
        default: process.env.AWS_REGION,
      },
      a: {
        alias: ["accountId"],
        type: "string",
        default: process.env.AWS_ACCOUNT_ID,
      },
      p: {
        alias: ["partition"],
        type: "string",
        default: process.env.AWS_PARTITION,
      },
    },
    async (argv: any) => {
      const sts = new STSClient();

      const assets = getNestedAssets(path.resolve(argv.manifest));

      for (var [assetKey, asset] of assets.entries()) {
        if (asset.source.packaging === "zip") {
          await zip(asset.source.path, `${asset.source.path}.zip`);
          asset.source.path = `${asset.source.path}.zip`;
        }

        for (var destinationKey in asset.destinations) {
          const destination = asset.destinations[destinationKey];

          const objectKey = destination.objectKey;
          const bucketName = destination.bucketName
            .replaceAll("${AWS::Partition}", argv.partition)
            .replaceAll("${AWS::Region}", argv.region)
            .replaceAll("${AWS::AccountId}", argv.accountId);
          const assumeRoleArn = destination
            .assumeRoleArn!.replaceAll("${AWS::Partition}", argv.partition)
            .replaceAll("${AWS::Region}", argv.region)
            .replaceAll("${AWS::AccountId}", argv.accountId);

          const fileStream = fs.createReadStream(asset.source.path);

          await new S3Client({
            credentials: fromTemporaryCredentials({
              params: {
                RoleArn: assumeRoleArn,
                RoleSessionName: `upload-cdk-asset-${assetKey}`.substring(
                  0,
                  64
                ),
                DurationSeconds: 900,
              },
            }),
          }).send(
            new PutObjectCommand({
              Bucket: bucketName,
              Key: objectKey,
              Body: fileStream,
            })
          );
        }
      }
    }
  )
  .command(
    "ls <manifest>",
    "List all discovered CDK assets",
    {},
    (argv: any) => {
      const assets = getNestedAssets(path.resolve(argv.manifest));

      for (var [assetKey, asset] of assets.entries()) {
        console.log(asset.source.path);
      }
    }
  )
  .help()
  .alias("help", "h").argv;
