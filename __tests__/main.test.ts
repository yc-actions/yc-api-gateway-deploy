/**
 * Unit tests for the action's main functionality, src/main.ts
 *
 * These should be run as if the action was called from a workflow.
 * Specifically, the inputs listed in `action.yml` should be set as environment
 * variables following the pattern `INPUT_<INPUT_NAME>`.
 */

import * as core from '@actions/core'
import * as main from '../src/main'
import * as sdk from '@yandex-cloud/nodejs-sdk'
import * as github from '@actions/github'
import { ServiceAccount } from '@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/iam/v1/service_account'
import { ApiGateway } from '@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/serverless/apigateway/v1/apigateway'

// Mock the action's main function
const runMock = jest.spyOn(main, 'run')

// Mock the GitHub Actions core library
let errorMock: jest.SpyInstance
let getInputMock: jest.SpyInstance
let setFailedMock: jest.SpyInstance
let setOutputMock: jest.SpyInstance

// yandex sdk mock
declare module '@yandex-cloud/nodejs-sdk' {
    function __setApiGatewayList(value: ApiGateway[]): void

    function __setServiceAccountList(value: ServiceAccount[]): void

    function __setCreateGatewayFail(value: boolean): void

    function __setUpdateGatewayFail(value: boolean): void
}

const requiredInputs: Record<string, string> = {
    'yc-sa-json-credentials': `{
    "id": "id",
    "created_at": "2021-01-01T00:00:00Z", 
    "key_algorithm": "RSA_2048",
    "service_account_id": "service_account_id",
    "private_key": "private_key",
    "public_key": "public_key"
  }`,
    'folder-id': 'folderid',
    'spec-file': '__tests__/spec.yaml'
}

const defaultInputs: Record<string, string> = {
    ...requiredInputs,
    'gateway-name': 'gatewayname'
}
describe('action', () => {
    beforeEach(() => {
        jest.clearAllMocks()

        errorMock = jest.spyOn(core, 'error').mockImplementation()
        getInputMock = jest.spyOn(core, 'getInput').mockImplementation()
        setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation()
        setOutputMock = jest.spyOn(core, 'setOutput').mockImplementation()
        jest.spyOn(github.context, 'repo', 'get').mockImplementation(() => {
            return {
                owner: 'some-owner',
                repo: 'some-repo'
            }
        })
        sdk.__setServiceAccountList([
            ServiceAccount.fromJSON({
                id: 'serviceaccountid'
            })
        ])
        sdk.__setCreateGatewayFail(false)
        sdk.__setUpdateGatewayFail(false)
    })

    it('updates gateway when there is one', async () => {
        // Set the action's inputs as return values from core.getInput()
        getInputMock.mockImplementation((name: string): string => {
            const inputs = {
                ...defaultInputs
            }

            return inputs[name] || ''
        })

        process.env.GITHUB_REPOSITORY = 'owner/repo'
        process.env.GITHUB_SHA = 'sha'

        sdk.__setApiGatewayList([
            ApiGateway.fromJSON({
                id: 'apigatewayid',
                folderId: 'folderid',
                name: 'gatewayname',
                description: 'description',
                openapiSpec: 'openapispec',
                domain: 'domain'
            })
        ])

        await main.run()
        expect(runMock).toHaveReturned()
        expect(errorMock).not.toHaveBeenCalled()
        expect(setFailedMock).not.toHaveBeenCalled()
        expect(setOutputMock).toHaveBeenCalledWith('id', 'apigatewayid')
        expect(setOutputMock).toHaveBeenCalledWith('domain', 'domain')
    })

    it('creates gateway when there is none', async () => {
        // Set the action's inputs as return values from core.getInput()
        getInputMock.mockImplementation((name: string): string => {
            const inputs = {
                ...defaultInputs
            }

            return inputs[name] || ''
        })

        sdk.__setApiGatewayList([])

        await main.run()
        expect(runMock).toHaveReturned()
        expect(errorMock).not.toHaveBeenCalled()
        expect(setFailedMock).not.toHaveBeenCalled()
        expect(setOutputMock).toHaveBeenCalledWith('id', 'apigatewayid')
        expect(setOutputMock).toHaveBeenCalledWith('domain', 'domain')
    })

    it('reports if could not create gateway', async () => {
        // Set the action's inputs as return values from core.getInput()
        getInputMock.mockImplementation((name: string): string => {
            const inputs = {
                ...defaultInputs
            }

            return inputs[name] || ''
        })

        sdk.__setApiGatewayList([])
        sdk.__setCreateGatewayFail(true)

        await main.run()
        expect(runMock).toHaveReturned()
        expect(errorMock).toHaveBeenCalled()
        expect(setFailedMock).toHaveBeenCalled()
    })

    it('should fail if neither spec file nor spec provided', async () => {
        // Set the action's inputs as return values from core.getInput()
        getInputMock.mockImplementation((name: string): string => {
            const inputs: Record<string, string> = {
                ...defaultInputs,
                spec: '',
                'spec-file': ''
            }

            return inputs[name] || ''
        })

        sdk.__setApiGatewayList([])

        await main.run()
        expect(runMock).toHaveReturned()
        expect(errorMock).not.toHaveBeenCalled()
        expect(setFailedMock).toHaveBeenCalledWith(new Error('Either spec or spec-file input must be provided'))
        expect(setOutputMock).not.toHaveBeenCalledWith('id', 'apigatewayid')
        expect(setOutputMock).not.toHaveBeenCalledWith('domain', 'domain')
    })

    it('should work with inline spec', async () => {
        // Set the action's inputs as return values from core.getInput()
        getInputMock.mockImplementation((name: string): string => {
            const inputs: Record<string, string> = {
                ...defaultInputs,
                spec: `openapi: 3.0.3
info:
  title: My service
  description: My service
  version: 1.0.0
servers:
  - url: 'https://'
paths:
  /:
    get:
      responses:
        '200':
          description: OK
      security:
        - bearerAuth: []
    post:
      responses:
        '200':
          description: OK
      security:
        - bearerAuth: []`,
                'spec-file': ''
            }

            return inputs[name] || ''
        })

        sdk.__setApiGatewayList([])

        await main.run()
        expect(runMock).toHaveReturned()
        expect(errorMock).not.toHaveBeenCalled()
        expect(setFailedMock).not.toHaveBeenCalled()
        expect(setOutputMock).toHaveBeenCalledWith('id', 'apigatewayid')
        expect(setOutputMock).toHaveBeenCalledWith('domain', 'domain')
    })

    it('reports if could not update gateway', async () => {
        // Set the action's inputs as return values from core.getInput()
        getInputMock.mockImplementation((name: string): string => {
            const inputs = {
                ...defaultInputs
            }

            return inputs[name] || ''
        })

        sdk.__setApiGatewayList([
            ApiGateway.fromJSON({
                id: 'gatewayid',
                folderId: 'folderid',
                name: 'gatewayname',
                description: 'description',
                openapiSpec: 'openapispec',
                domain: 'domain'
            })
        ])
        sdk.__setUpdateGatewayFail(true)

        await main.run()
        expect(runMock).toHaveReturned()
        expect(errorMock).toHaveBeenCalled()
        expect(setFailedMock).toHaveBeenCalled()
    })
})
