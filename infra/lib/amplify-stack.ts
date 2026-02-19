import * as cdk from 'aws-cdk-lib';
import * as amplify from 'aws-cdk-lib/aws-amplify';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class AmplifyStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a secret for GitHub token
    // You'll need to store your GitHub token in Secrets Manager:
    // aws secretsmanager create-secret --name github-token --secret-string "your-github-pat"
    const githubToken = secretsmanager.Secret.fromSecretNameV2(
      this,
      'GitHubToken',
      'github-token'
    );

    // Create Amplify App
    const amplifyApp = new amplify.CfnApp(this, 'AmplifyApp', {
      name: 'story-clunker',
      repository: 'https://github.com/skazantsev/story-clunker',
      accessToken: githubToken.secretValue.unsafeUnwrap(),
      platform: 'WEB',
      buildSpec: `version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: dist
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*`,
      environmentVariables: [
        { name: 'VITE_SUPABASE_URL', value: '' },
        { name: 'VITE_SUPABASE_ANON_KEY', value: '' },
      ],
      enableBranchAutoDeletion: true,
    });

    // Create Branch
    const mainBranch = new amplify.CfnBranch(this, 'MainBranch', {
      appId: amplifyApp.attrAppId,
      branchName: 'main',
      stage: 'PRODUCTION',
      enableAutoBuild: true,
      framework: 'React',
    });

    // Ensure branch is created after app
    mainBranch.addDependency(amplifyApp);

    // Outputs
    new cdk.CfnOutput(this, 'AppId', {
      value: amplifyApp.attrAppId,
      description: 'Amplify App ID',
    });

    new cdk.CfnOutput(this, 'AppUrl', {
      value: `https://${mainBranch.branchName}.${amplifyApp.attrAppId}.amplifyapp.com`,
      description: 'Amplify App URL',
    });
  }
}
