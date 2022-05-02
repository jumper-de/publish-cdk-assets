#!/usr/bin/env node
const path = require("path");
const fs = require("fs");

const { Manifest } = require("aws-cdk-lib/cloud-assembly-schema");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const { fromTemporaryCredentials } = require("@aws-sdk/credential-providers");
const { zip } = require("zip-a-folder");

import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

import { getNestedAssets } from "./../src/get-nested-assets";

require("yargs")
  .command(
    "* <path>",
    "Publish CDK assets listed in manifest.json at <path>",
    {
      r: {
        alias: ["region"],
        type: "string",
        default: process.env.AWS_REGION,
      },
    },
    async (argv: any) => {
      const assets = getNestedAssets(path.resolve(argv.path));

      const client = new STSClient({});
      const [, partition, , , accountId] = (
        await client.send(new GetCallerIdentityCommand({}))
      ).Arn!.split(":");

      for (var [assetKey, asset] of assets.entries()) {
        if (asset.source.packaging === "zip") {
          await zip(asset.source.path, `${asset.source.path}.zip`);
          asset.source.path = `${asset.source.path}.zip`;
        }

        for (var destinationKey in asset.destinations) {
          const destination = asset.destinations[destinationKey];

          const objectKey = destination.objectKey;
          const bucketName = destination.bucketName
            .replaceAll("${AWS::Partition}", partition)
            .replaceAll("${AWS::Region}", argv.region)
            .replaceAll("${AWS::AccountId}", accountId);
          const assumeRoleArn = destination
            .assumeRoleArn!.replaceAll("${AWS::Partition}", partition)
            .replaceAll("${AWS::Region}", argv.region)
            .replaceAll("${AWS::AccountId}", accountId);

          const fileStream = fs.createReadStream(asset.source.path);

          const credentials = fromTemporaryCredentials({
            params: {
              RoleArn: assumeRoleArn,
              RoleSessionName: `upload-cdk-asset-${assetKey}`.substring(0, 64),
              DurationSeconds: 900,
            },
          });

          await new S3Client({
            credentials: credentials,
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
    "ls <path>",
    "List all CDK assets found in manifest.json at <path>",
    {},
    async (argv: any) => {
      const assets = getNestedAssets(path.resolve(argv.path));

      for (var [assetKey, asset] of assets.entries()) {
        console.log(asset.source.path);
      }
    }
  )
  .help()
  .alias("help", "h").argv;
