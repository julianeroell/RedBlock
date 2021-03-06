import { PageEnum, UI_UPDATE_DELAY } from '../common.js'
import { alert } from './background.js'
import ChainBlocker from './chainblock.js'
import * as Storage from './storage.js'
import * as TwitterAPI from './twitter-api.js'
import * as i18n from '../i18n.js'
import { initializeContextMenu } from './context-menu.js'
import { initializeWebRequest } from './webrequest.js'

type TwitterUser = TwitterAPI.TwitterUser

let storageQueue = Promise.resolve()
const chainblocker = new ChainBlocker()
const tabConnections = new Set<number>()

export async function executeFollowerChainBlock(request: FollowerBlockSessionRequest) {
  const myself = await TwitterAPI.getMyself().catch(() => null)
  if (!myself) {
    alert(i18n.getMessage('error_occured_check_login'))
    return
  }
  try {
    const sessionId = chainblocker.add(myself, request)
    if (!sessionId) {
      console.info('not added. skip')
      return
    }
    chainblocker.start(sessionId)
    browser.runtime
      .sendMessage<RBMessages.PopupSwitchTab>({
        messageType: 'PopupSwitchTab',
        page: PageEnum.Sessions,
      })
      .catch(() => {}) // 우클릭 체인블락의 경우 팝업이 없음
  } catch (err) {
    if (err instanceof TwitterAPI.RateLimitError) {
      alert(i18n.getMessage('error_rate_limited'))
    } else {
      throw err
    }
  }
}

export async function executeTweetReactionChainBlock(request: TweetReactionBlockSessionRequest) {
  const myself = await TwitterAPI.getMyself().catch(() => null)
  if (!myself) {
    alert(i18n.getMessage('error_occured_check_login'))
    return
  }
  try {
    const sessionId = chainblocker.add(myself, request)
    if (!sessionId) {
      console.info('not added. skip')
      return
    }
    chainblocker.start(sessionId)
    browser.runtime
      .sendMessage<RBMessages.PopupSwitchTab>({
        messageType: 'PopupSwitchTab',
        page: PageEnum.Sessions,
      })
      .catch(() => {}) // 우클릭 체인블락의 경우 팝업이 없음
  } catch (err) {
    if (err instanceof TwitterAPI.RateLimitError) {
      alert(i18n.getMessage('error_rate_limited'))
    } else {
      throw err
    }
  }
}

async function stopChainBlock(sessionId: string) {
  chainblocker.stop(sessionId)
}

async function stopAllChainBlock() {
  chainblocker.stopAll()
}

async function sendChainBlockerInfoToTabs() {
  const infos = chainblocker.getAllSessionsProgress().reverse()
  for (const tabId of tabConnections) {
    browser.tabs
      .sendMessage<RBMessages.ChainBlockInfo>(tabId, {
        messageType: 'ChainBlockInfo',
        infos,
      })
      .catch(() => {
        tabConnections.delete(tabId)
      })
  }
}

async function sendProgress() {
  const infos = chainblocker.getAllSessionsProgress()
  return browser.runtime
    .sendMessage<RBMessages.ChainBlockInfo>({
      messageType: 'ChainBlockInfo',
      infos,
    })
    .catch(() => {})
}

async function cleanupSessions() {
  chainblocker.cleanupSessions()
}

async function saveUserToStorage(user: TwitterUser) {
  console.info('saving user', user)
  storageQueue = storageQueue.then(() => Storage.insertSingleUserAndSave(user))
  return storageQueue
}

async function removeUserFromStorage(user: TwitterUser) {
  console.info('removing user', user)
  storageQueue = storageQueue.then(() => Storage.removeSingleUserAndSave(user))
  return storageQueue
}

function handleExtensionMessage(message: RBAction, sender: browser.runtime.MessageSender) {
  switch (message.actionType) {
    case 'StartFollowerChainBlock':
      executeFollowerChainBlock(message.request).then(sendChainBlockerInfoToTabs)
      break
    case 'StartTweetReactionChainBlock':
      executeTweetReactionChainBlock(message.request).then(sendChainBlockerInfoToTabs)
      break
    case 'StopChainBlock':
      stopChainBlock(message.sessionId).then(sendChainBlockerInfoToTabs)
      break
    case 'StopAllChainBlock':
      stopAllChainBlock()
      break
    case 'RequestProgress':
      sendProgress()
      break
    case 'RequestCleanup':
      cleanupSessions()
      break
    case 'InsertUserToStorage':
      saveUserToStorage(message.user)
      break
    case 'RemoveUserFromStorage':
      removeUserFromStorage(message.user)
      break
    case 'ConnectToBackground':
      sender.tab && tabConnections.add(sender.tab.id!)
      break
    case 'DisconnectToBackground':
      sender.tab && tabConnections.delete(sender.tab.id!)
      break
  }
}

function initialize() {
  window.setInterval(sendChainBlockerInfoToTabs, UI_UPDATE_DELAY)
  browser.runtime.onMessage.addListener(
    (msg: object, sender: browser.runtime.MessageSender, _sendResponse: (response: any) => Promise<void>): true => {
      if (!(typeof msg === 'object' && 'actionType' in msg)) {
        console.debug('unknown msg?', msg)
        return true
      }
      handleExtensionMessage(msg as RBAction, sender)
      return true
    }
  )
  initializeContextMenu()
  initializeWebRequest()
}

initialize()
