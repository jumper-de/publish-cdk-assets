import path from "path";
import fs from "fs";
import { Manifest } from "aws-cdk-lib/cloud-assembly-schema";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { zip } from "zip-a-folder";
import { STSClient, GetCallerIdentityCommand } from "@aws-sdk/client-sts";

import { Asset } from "./interfaces";
import { getNestedAssets } from "./get-nested-assets";

export const publishAssets = async (
    assets: Map<string, Asset>,
    partition: string,
    account: string,
    region: string
) => {
    for (var [assetKey, asset] of assets.entries()) {
        if (asset.source.packaging === "zip") {
            console.log(`Compressing ${assetKey}`);
            await zip(asset.source.path!, `${asset.source.path}.zip`);
            asset.source.path = `${asset.source.path}.zip`;
        }

        console.log(`Publishing ${assetKey}`);

        for (var destinationKey in asset.destinations) {
            const destination = asset.destinations[destinationKey];

            const objectKey = destination.objectKey;
            const bucketName = destination.bucketName
                .replaceAll("${AWS::Partition}", partition)
                .replaceAll("${AWS::Region}", region)
                .replaceAll("${AWS::AccountId}", account);
            const assumeRoleArn = destination
                .assumeRoleArn!.replaceAll("${AWS::Partition}", partition)
                .replaceAll("${AWS::Region}", region)
                .replaceAll("${AWS::AccountId}", account);

            const fileStream = fs.createReadStream(asset.source.path!);

            const credentials = fromTemporaryCredentials({
                params: {
                    RoleArn: assumeRoleArn,
                    RoleSessionName: `upload-cdk-asset-${assetKey}`.substring(
                        0,
                        64
                    ),
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
};
