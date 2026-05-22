import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildMessagingPlatformFormValues,
  normalizeMessagingPlatformForm,
} from '../scripts/dev-api.js'

test('渠道保存会为 Telegram 补齐新版 OpenClaw 必填访问策略', () => {
  const form = normalizeMessagingPlatformForm('telegram', {
    botToken: '123:token',
  })

  assert.equal(form.botToken, '123:token')
  assert.equal(form.dmPolicy, 'pairing')
  assert.equal(form.groupPolicy, 'allowlist')
})

test('渠道保存会把旧 UI 策略值转换为 OpenClaw 支持的枚举', () => {
  const form = normalizeMessagingPlatformForm('slack', {
    mode: 'socket',
    botToken: 'xoxb-token',
    appToken: 'xapp-token',
    dmPolicy: 'allow',
    groupPolicy: 'mentioned',
  })

  assert.equal(form.dmPolicy, 'open')
  assert.deepEqual(form.allowFrom, ['*'])
  assert.equal(form.groupPolicy, 'open')
  assert.equal(form.requireMention, true)
  assert.equal(form.webhookPath, '/slack/events')
  assert.equal(form.userTokenReadOnly, false)
})

test('渠道保存不会向不支持顶层 requireMention 的平台写入非法字段', () => {
  const form = normalizeMessagingPlatformForm('signal', {
    account: '+15551234567',
    dmPolicy: 'deny',
    groupPolicy: 'mentioned',
  })

  assert.equal(form.dmPolicy, 'disabled')
  assert.equal(form.groupPolicy, 'open')
  assert.equal(Object.hasOwn(form, 'requireMention'), false)
})

test('渠道保存会为飞书补齐新版内核要求的默认字段', () => {
  const form = normalizeMessagingPlatformForm('feishu', {
    appId: 'cli_a',
    appSecret: 'secret',
    domain: '',
  })

  assert.equal(form.domain, 'feishu')
  assert.equal(form.connectionMode, 'websocket')
  assert.equal(form.webhookPath, '/feishu/events')
  assert.equal(form.dmPolicy, 'pairing')
  assert.equal(form.groupPolicy, 'allowlist')
  assert.equal(form.reactionNotifications, 'off')
  assert.equal(form.typingIndicator, true)
  assert.equal(form.resolveSenderNames, true)
})

test('渠道读取会把新版访问策略字段回显为表单可编辑值', () => {
  const values = buildMessagingPlatformFormValues('telegram', {
    botToken: '123:token',
    dmPolicy: 'allowlist',
    groupPolicy: 'disabled',
    allowFrom: ['u-1', 'u-2'],
  })

  assert.equal(values.botToken, '123:token')
  assert.equal(values.dmPolicy, 'allowlist')
  assert.equal(values.groupPolicy, 'disabled')
  assert.equal(values.allowFrom, 'u-1, u-2')
  assert.equal(values.allowedUsers, 'u-1, u-2')
})

test('渠道读取会合并飞书账号凭证和根节点共享策略字段', () => {
  const values = buildMessagingPlatformFormValues(
    'feishu',
    {
      appId: 'cli_a',
      appSecret: 'secret',
    },
    {
      channelRoot: {
        domain: 'lark',
        connectionMode: 'websocket',
        webhookPath: '/feishu/events',
        dmPolicy: 'pairing',
        groupPolicy: 'allowlist',
        reactionNotifications: 'off',
        typingIndicator: true,
        resolveSenderNames: false,
      },
    },
  )

  assert.equal(values.appId, 'cli_a')
  assert.equal(values.appSecret, 'secret')
  assert.equal(values.domain, 'lark')
  assert.equal(values.connectionMode, 'websocket')
  assert.equal(values.webhookPath, '/feishu/events')
  assert.equal(values.dmPolicy, 'pairing')
  assert.equal(values.groupPolicy, 'allowlist')
  assert.equal(values.reactionNotifications, 'off')
  assert.equal(values.typingIndicator, 'true')
  assert.equal(values.resolveSenderNames, 'false')
})

test('渠道读取飞书多账号时不会用根节点旧凭证覆盖账号凭证', () => {
  const values = buildMessagingPlatformFormValues(
    'feishu',
    {
      appId: 'account_app',
      appSecret: 'account_secret',
      dmPolicy: 'pairing',
    },
    {
      channelRoot: {
        appId: 'root_app',
        appSecret: 'root_secret',
        domain: 'lark',
        groupPolicy: 'allowlist',
      },
    },
  )

  assert.equal(values.appId, 'account_app')
  assert.equal(values.appSecret, 'account_secret')
  assert.equal(values.domain, 'lark')
  assert.equal(values.dmPolicy, 'pairing')
  assert.equal(values.groupPolicy, 'allowlist')
})

test('渠道读取会把 open + requireMention 反向回显为仅提及时策略', () => {
  const values = buildMessagingPlatformFormValues('slack', {
    mode: 'socket',
    botToken: 'xoxb-token',
    appToken: 'xapp-token',
    groupPolicy: 'open',
    requireMention: true,
  })

  assert.equal(values.groupPolicy, 'mentioned')
  assert.equal(values.requireMention, 'true')
})

test('渠道保存会在用户改回所有群组时显式清除仅提及开关', () => {
  const form = normalizeMessagingPlatformForm('slack', {
    mode: 'socket',
    botToken: 'xoxb-token',
    appToken: 'xapp-token',
    groupPolicy: 'open',
  })

  assert.equal(form.groupPolicy, 'open')
  assert.equal(form.requireMention, false)
})
