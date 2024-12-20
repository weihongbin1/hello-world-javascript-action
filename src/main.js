const core = require('@actions/core')
const github = require('@actions/github')
const tc = require('@actions/tool-cache')
const exec = require('@actions/exec')
const fs = require('fs')
const path = require('path')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const qid = core.getInput('qid', { required: true })
    if (!qid) {
      core.setFailed('qid is required')
    }
    const apiId = core.getInput('apiId', { required: true })
    if (!apiId) {
      core.setFailed('apiId is required')
    }
    const apiKey = core.getInput('apiKey', { required: true })
    if (!apiKey) {
      core.setFailed('apiKey is required')
    }
    const storeFilePath = core.getInput('storeFilePath', { required: true })
    if (!storeFilePath) {
      core.setFailed('storeFilePath is required')
    }
    const storePassword = core.getInput('storePassword', { required: true })
    if (!storePassword) {
      core.setFailed('storePassword is required')
    }
    const keyAlias = core.getInput('keyAlias', { required: true })
    if (!keyAlias) {
      core.setFailed('keyAlias is required')
    }
    const keyPassword = core.getInput('keyPassword', { required: true })
    if (!keyPassword) {
      core.setFailed('keyPassword is required')
    }
    const jiaGuConfig = core.getInput('jiaGuConfig', { required: true })
    if (!jiaGuConfig) {
      core.setFailed('jiaGuConfig is required')
    }
    const apkFilePath = core.getInput('apkFilePath', { required: true })
    if (!apkFilePath) {
      core.setFailed('apkFilePath is required')
    }

    const jiaGuCliDownloadUrl =
      'https://files.mihuashi.com/misc/github-actions/jiagu_cli_client_linux_x64.zip'
    const jiaGuCliPath = await tc.downloadTool(jiaGuCliDownloadUrl)
    const jiaGuCliExtractedFolder = await tc.extractZip(jiaGuCliPath)
    const cachedJiaGuCliPath = await tc.cacheDir(
      jiaGuCliExtractedFolder,
      'jiaGuCli',
      '1.0.0'
    )
    const cliPath = `${cachedJiaGuCliPath}/jiagu_cli_client_linux_x64`
    core.addPath(cliPath)
    core.info(`Added ${cliPath} to PATH`)

    const licenseFile = path.join(cliPath, 'license')
    const licenseContent = `qid=${qid}\napi_id=${apiId}\napi_key=${apiKey}`
    fs.writeFileSync(licenseFile, licenseContent, 'utf8')
    core.info(`License file written to ${licenseFile}`)

    let myOutput = ''
    let myError = ''

    const options = {}
    options.listeners = {
      stdout: data => {
        myOutput += data.toString()
      },
      stderr: data => {
        myError += data.toString()
      }
    }
    // 配置加固参数 jiaGuConfig
    // startup.sh --config-jiagu-apk update ${jiaGuConfig} --name default --pn any
    // 把 jiaGuConfig 按照空格分割，然后拼接成数组
    const jiaGuConfigArray = jiaGuConfig.split(' ')
    const jiaGuConfigArgs = [
      '--config-jiagu-apk',
      'update',
      ...jiaGuConfigArray,
      '--name',
      'default',
      '--pn',
      'any'
    ]
    await exec.exec('startup.sh', jiaGuConfigArgs, options)
    core.info(`配置加固参数 Output: ${myOutput}`)
    if (myError) {
      core.setFailed(`配置加固参数 Error: ${myError}`)
    }

    myError = ''
    myOutput = ''
    await exec.exec('startup.sh', ['--config-jiagu-apk', 'show'], options)
    core.info(`查看加固配置 Output: : ${myOutput}`)
    if (myError) {
      core.setFailed(`查看加固配置 Error: ${myError}`)
    }

    // --config-sign-apk add Keystore文件路径 Keystore密码 别名 别名密码
    myError = ''
    myOutput = ''
    await exec.exec(
      'startup.sh',
      [
        '--config-sign-apk',
        'add',
        storeFilePath,
        storePassword,
        keyAlias,
        keyPassword
      ],
      options
    )
    core.info(`配置签名参数 Output: ${myOutput}`)
    if (myError) {
      core.setFailed(`配置签名参数 Error: ${myError}`)
    }
    // The `who-to-greet` input is defined in action metadata file
    const whoToGreet = core.getInput('apiId', { required: true })
    core.info(`Hello, ${whoToGreet}!`)

    // Get the current time and set as an output
    const time = new Date().toTimeString()
    core.setOutput('jiaGuApkFilePath', time)

    // Output the payload for debugging
    core.info(
      `The event payload: ${JSON.stringify(github.context.payload, null, 2)}`
    )
  } catch (error) {
    // Fail the workflow step if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
