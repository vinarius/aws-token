#!/usr/bin/env node

const [, , ...args] = process.argv;
const profile = args[0];
const token = args[1];
const profileToken = `${profile}-token`;

const AWS = require('aws-sdk');
const moment = require('moment-timezone');
const credentials = new AWS.SharedIniFileCredentials({profile});
const sts = new AWS.STS({credentials});
const iam = new AWS.IAM({credentials});

const util = require('util');
const listMFADevices = util.promisify(iam.listMFADevices.bind(iam));
const getSessionToken = util.promisify(sts.getSessionToken.bind(sts));
const exec = util.promisify(require('child_process').exec);

(async function () {
  const listMfaDevicesResponse = await listMFADevices();
  const serialNumber = listMfaDevicesResponse.MFADevices[0].SerialNumber;
  const sessionTokenParams = {
    DurationSeconds: 129600,
    SerialNumber: serialNumber,
    TokenCode: token
  };
  const getSessionTokenResponse = await getSessionToken(sessionTokenParams);
  const creds = getSessionTokenResponse.Credentials;

  try {
    await exec(
      `aws configure set aws_access_key_id ${creds.AccessKeyId} --profile ${profileToken}`
    );
    await exec(
      `aws configure set aws_secret_access_key ${creds.SecretAccessKey} --profile ${profileToken}`
    );
    await exec(
      `aws configure set aws_session_token ${creds.SessionToken} --profile ${profileToken}`
    );
  } catch (error) {
    throw error;
  }

  console.log(
    `Set session token in profile ${profileToken}, expires ${moment(creds.Expiration)
      .tz('America/New_York')
      .format('MM/DD/YYYY hh:mm z')}`
  );
})();