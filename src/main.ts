import { info, getInput, setFailed, setOutput, error } from '@actions/core'
import { context } from '@actions/github'

import { decodeMessage, errors, serviceClients, Session, waitForOperation } from '@yandex-cloud/nodejs-sdk'
import { FieldMask } from '@yandex-cloud/nodejs-sdk/dist/generated/google/protobuf/field_mask'
import { ApiGateway } from '@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/serverless/apigateway/v1/apigateway'
import {
    ApiGatewayServiceService,
    CreateApiGatewayRequest,
    ListApiGatewayRequest,
    ListApiGatewayResponse,
    UpdateApiGatewayRequest
} from '@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/serverless/apigateway/v1/apigateway_service'
import { WrappedServiceClientType } from '@yandex-cloud/nodejs-sdk/dist/types'
import { readFileSync } from 'fs'
import { fromServiceAccountJsonFile } from './service-account-json'

async function findGatewayByName(
    gatewayService: WrappedServiceClientType<typeof ApiGatewayServiceService>,
    folderId: string,
    gatewayName: string
): Promise<ListApiGatewayResponse> {
    return await gatewayService.list(
        ListApiGatewayRequest.fromPartial({
            pageSize: 100,
            folderId,
            filter: `name = "${gatewayName}"`
        })
    )
}

async function createGateway(
    session: Session,
    gatewayService: WrappedServiceClientType<typeof ApiGatewayServiceService>,
    folderId: string,
    gatewayName: string,
    gatewaySpec: string
): Promise<ApiGateway> {
    const repo = context.repo
    const request = CreateApiGatewayRequest.fromPartial({
        folderId,
        name: gatewayName,
        description: `Created from: ${repo.owner}/${repo.repo}`,
        openapiSpec: gatewaySpec
    })

    let operation = await gatewayService.create(request)

    operation = await waitForOperation(operation, session)
    if (!operation.response) {
        throw new Error('Empty operation response')
    }
    return decodeMessage<ApiGateway>(operation.response)
}

async function updateGatewaySpec(
    session: Session,
    gatewayService: WrappedServiceClientType<typeof ApiGatewayServiceService>,
    gatewayId: string,
    gatewaySpec: string
): Promise<ApiGateway> {
    const request = UpdateApiGatewayRequest.fromPartial({
        apiGatewayId: gatewayId,
        openapiSpec: gatewaySpec,
        updateMask: FieldMask.fromPartial({
            paths: ['openapi_spec']
        })
    })

    let operation = await gatewayService.update(request)

    operation = await waitForOperation(operation, session)
    if (!operation.response) {
        throw new Error('Empty operation response')
    }
    return decodeMessage<ApiGateway>(operation.response)
}

export async function run(): Promise<void> {
    try {
        info(`start`)
        const ycSaJsonCredentials = getInput('yc-sa-json-credentials', {
            required: true
        })

        const folderId: string = getInput('folder-id', {
            required: true
        })
        const gatewayName: string = getInput('gateway-name', {
            required: true
        })
        const gatewaySpecFile = getInput('spec-file')
        let gatewaySpec = getInput('spec')

        if (!gatewaySpec && !gatewaySpecFile) {
            setFailed(new Error('Either spec or spec-file input must be provided'))
            return
        }

        if (gatewaySpecFile) {
            gatewaySpec = readFileSync(gatewaySpecFile).toString()
        }
        info(`Folder ID: ${folderId}, gateway name: ${gatewayName}`)

        const serviceAccountJson = fromServiceAccountJsonFile(JSON.parse(ycSaJsonCredentials))
        const session = new Session({ serviceAccountJson })
        const gatewayService = session.client(serviceClients.ApiGatewayServiceClient)

        const gatewaysResponse = await findGatewayByName(gatewayService, folderId, gatewayName)
        let gateway: ApiGateway
        if (gatewaysResponse.apiGateways.length) {
            gateway = gatewaysResponse.apiGateways[0]
            info(`Gateway with name: ${gatewayName} already exists and has id: ${gateway.id}`)
            gateway = await updateGatewaySpec(session, gatewayService, gateway.id, gatewaySpec)
            info(`Gateway updated successfully`)
        } else {
            info(`There is no gateway with name: ${gatewayName}. Creating a new one.`)
            gateway = await createGateway(session, gatewayService, folderId, gatewayName, gatewaySpec)
            info(`Gateway successfully created. Id: ${gateway.id}`)
        }
        setOutput('id', gateway.id)
        setOutput('domain', gateway.domain)
    } catch (err) {
        if (err instanceof errors.ApiError) {
            error(`${err.message}\nx-request-id: ${err.requestId}\nx-server-trace-id: ${err.serverTraceId}`)
        } else {
            error(`${err}`)
        }
        setFailed(`${err}`)
    }
}
