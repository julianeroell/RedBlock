import * as Storage from '../../scripts/background/storage.js'
import * as TwitterAPI from '../../scripts/background/twitter-api.js'
import { TwitterUser } from '../../scripts/background/twitter-api.js'
import { formatNumber, TwitterUserMap } from '../../scripts/common.js'
import * as TextGenerate from '../../scripts/text-generate.js'
import { insertUserToStorage, removeUserFromStorage, startFollowerChainBlock } from '../popup.js'
import { ModalContext, SnackBarContext } from './contexts.js'
import { TabPanel } from './ui-common.js'

type SessionOptions = FollowerBlockSessionRequest['options']
type SelectUserGroup = 'invalid' | 'current' | 'saved'

const SelectedUserContext = React.createContext<TwitterUser | null>(null)

function TargetSavedUsers(props: {
  currentUser: TwitterUser | null
  selectedUserGroup: SelectUserGroup
  savedUsers: TwitterUserMap
  changeUser: (userName: string, group: SelectUserGroup) => Promise<void>
}) {
  const { currentUser, selectedUserGroup, savedUsers, changeUser } = props
  const snackBarCtx = React.useContext(SnackBarContext)
  const selectedUser = React.useContext(SelectedUserContext)
  async function insertUser() {
    if (selectedUser) {
      insertUserToStorage(selectedUser)
      snackBarCtx.snack(`@${selectedUser.screen_name}을(를) 저장했습니다.`)
    }
  }
  async function removeUser() {
    if (selectedUser) {
      removeUserFromStorage(selectedUser)
      snackBarCtx.snack(`@${selectedUser.screen_name}을(를) 제거했습니다.`)
    }
  }
  const sortedByName = (usersMap: TwitterUserMap): TwitterUser[] =>
    _.sortBy(usersMap.toUserArray(), user => user.screen_name.toLowerCase())
  const selectUserFromOption = (elem: EventTarget) => {
    if (!(elem instanceof HTMLSelectElement)) {
      throw new Error('unreachable')
    }
    const selectedOption = elem.selectedOptions[0]
    const group = selectedOption.getAttribute('data-group') as SelectUserGroup
    const userName = selectedOption.getAttribute('data-username')!
    changeUser(userName, group)
  }
  const M = MaterialUI
  const currentUserOption = ({ screen_name, name }: TwitterUser) => (
    <optgroup label="현재 유저">
      <option value={`current/${screen_name}`} data-group="current" data-username={screen_name}>
        @{screen_name} &lt;{name}&gt;
      </option>
    </optgroup>
  )
  return (
    <div>
      <M.Select
        native
        fullWidth={true}
        value={selectedUser ? `${selectedUserGroup}/${selectedUser.screen_name}` : 'invalid/???'}
        onChange={({ target }) => selectUserFromOption(target)}
      >
        <option value="invalid/???" data-group="invalid" data-username="???">
          체인블락을 실행할 사용자를 선택해주세요.
        </option>
        {currentUser && currentUserOption(currentUser)}
        <optgroup label="저장한 유저">
          {sortedByName(savedUsers).map(({ screen_name, name }, index) => (
            <option key={index} value={'saved/' + screen_name} data-group="saved" data-username={screen_name}>
              @{screen_name} &lt;{name}&gt;
            </option>
          ))}
        </optgroup>
      </M.Select>
      {selectedUser && (
        <M.Box margin="10px 0" display="flex" flexDirection="row-reverse">
          <M.ButtonGroup>
            <M.Button
              disabled={selectedUserGroup !== 'current'}
              onClick={insertUser}
              startIcon={<M.Icon>add_circle</M.Icon>}
            >
              저장
            </M.Button>
            <M.Button disabled={selectedUserGroup !== 'saved'} onClick={removeUser} startIcon={<M.Icon>delete</M.Icon>}>
              제거
            </M.Button>
          </M.ButtonGroup>
        </M.Box>
      )}
    </div>
  )
}

function TargetUserProfile(props: {
  isAvailable: boolean
  targetList: FollowKind
  options: FollowerBlockSessionRequest['options']
  setTargetList: (fk: FollowKind) => void
  mutateOptions: (part: Partial<SessionOptions>) => void
}) {
  const user = React.useContext(SelectedUserContext)!
  const { isAvailable, targetList, options, setTargetList, mutateOptions } = props
  const { quickMode } = options
  const biggerProfileImageUrl = user.profile_image_url_https.replace('_normal', '_bigger')
  const M = MaterialUI
  return (
    <div className="target-user-info">
      <div className="profile-image-area">
        <img alt="프로필 이미지" className="profile-image" src={biggerProfileImageUrl} />
      </div>
      <div className="profile-right-area">
        <div className="profile-right-info">
          <div className="nickname" title={user.name}>
            {user.name}
          </div>
          <div className="username">
            <a
              target="_blank"
              rel="noopener noreferer"
              href={`https://twitter.com/${user.screen_name}`}
              title={`https://twitter.com/${user.screen_name} 로 이동`}
            >
              @{user.screen_name}
            </a>
          </div>
        </div>
        {isAvailable || (
          <div className="profile-blocked">
            {user.protected && '\u{1f512} 프로텍트가 걸려있어 체인블락을 할 수 없습니다.'}
            {user.blocked_by && '\u26d4 이 사용자에게 차단당하여 체인블락을 할 수 없습니다.'}
          </div>
        )}
        <div className="profile-right-targetlist">
          <M.RadioGroup row={true}>
            <M.FormControlLabel
              control={<M.Radio />}
              onChange={() => setTargetList('followers')}
              disabled={!isAvailable}
              checked={targetList === 'followers'}
              label={`팔로워 ${formatNumber(user.followers_count, quickMode)}명`}
              title={`@${user.screen_name}의 팔로워를 차단합니다.`}
            />
            <M.FormControlLabel
              control={<M.Radio />}
              onChange={() => setTargetList('friends')}
              disabled={!isAvailable}
              checked={targetList === 'friends'}
              label={`팔로잉 ${formatNumber(user.friends_count, quickMode)}명`}
              title={`@${user.screen_name}이(가) 팔로우하는 사용자를 차단합니다.`}
            />
            <M.FormControlLabel
              control={<M.Radio />}
              onChange={() => setTargetList('mutual-followers')}
              disabled={!isAvailable}
              checked={targetList === 'mutual-followers'}
              label="맞팔로우만"
              title={`@${user.screen_name}이(가) 맞팔로우한 사용자만 골라서 차단합니다.`}
            />
          </M.RadioGroup>
          <hr />
          <M.FormControlLabel
            control={<M.Checkbox />}
            disabled={!isAvailable || targetList === 'mutual-followers'}
            checked={quickMode}
            onChange={() => mutateOptions({ quickMode: !quickMode })}
            label="퀵 모드 (200명 이하만 차단)"
            title="퀵 모드: 최근에 해당 사용자에게 체인블락을 실행하였으나 이후에 새로 생긴 팔로워만 더 빠르게 차단하기 위해 고안한 기능입니다."
          />
        </div>
      </div>
    </div>
  )
}

function TargetUserProfileEmpty(props: { reason: 'invalid-user' | 'loading' }) {
  let message = ''
  switch (props.reason) {
    case 'invalid-user':
      message = '사용자를 선택해주세요.'
      break
    case 'loading':
      message = '로딩 중...'
      break
  }
  return <div>{message}</div>
}

function TargetChainBlockOptions(props: {
  options: SessionOptions
  mutateOptions: (part: Partial<SessionOptions>) => void
}) {
  const { options, mutateOptions } = props
  const { myFollowers, myFollowings } = options
  const verbs: Array<[Verb, string]> = [
    ['Skip', '냅두기'],
    ['Mute', '뮤트하기'],
    ['Block', '차단하기'],
  ]
  const M = MaterialUI
  return (
    <React.Fragment>
      <M.FormControl component="fieldset">
        <M.FormLabel component="legend">내 팔로워</M.FormLabel>
        <M.RadioGroup row={true}>
          {verbs.map(([verb, vKor], index) => (
            <M.FormControlLabel
              key={index}
              control={<M.Radio size="small" />}
              checked={myFollowers === verb}
              onChange={() => mutateOptions({ myFollowers: verb })}
              label={vKor}
            />
          ))}
        </M.RadioGroup>
      </M.FormControl>
      <M.FormControl component="fieldset">
        <M.FormLabel component="legend">내 팔로잉</M.FormLabel>
        <M.RadioGroup row={true}>
          {verbs.map(([verb, vKor], index) => (
            <M.FormControlLabel
              key={index}
              control={<M.Radio size="small" />}
              checked={myFollowings === verb}
              onChange={() => mutateOptions({ myFollowings: verb })}
              label={vKor}
            />
          ))}
        </M.RadioGroup>
      </M.FormControl>
    </React.Fragment>
  )
}

function TargetUnChainBlockOptions(props: {
  options: SessionOptions
  mutateOptions: (part: Partial<SessionOptions>) => void
}) {
  const { options, mutateOptions } = props
  const { mutualBlocked } = options
  const verbs: Array<[Verb, string]> = [
    ['Skip', '(맞차단인 상태로) 냅두기'],
    ['UnBlock', '차단 해제하기'],
  ]
  const M = MaterialUI
  return (
    <React.Fragment>
      <M.FormControl component="fieldset">
        <M.FormLabel component="legend">서로 맞차단</M.FormLabel>
        <M.RadioGroup row={true}>
          {verbs.map(([verb, vKor], index) => (
            <M.FormControlLabel
              key={index}
              control={<M.Radio size="small" />}
              checked={mutualBlocked === verb}
              onChange={() => mutateOptions({ mutualBlocked: verb })}
              label={vKor}
            />
          ))}
        </M.RadioGroup>
      </M.FormControl>
    </React.Fragment>
  )
}

const userCache = new Map<string, TwitterUser>()
async function getUserByNameWithCache(userName: string): Promise<TwitterUser> {
  const key = userName.replace(/^@/, '').toLowerCase()
  if (userCache.has(key)) {
    return userCache.get(key)!
  }
  const user = await TwitterAPI.getSingleUserByName(key)
  userCache.set(user.screen_name, user)
  return user
}

export default function NewChainBlockPage(props: { currentUser: TwitterUser | null }) {
  const { currentUser } = props
  const modalContext = React.useContext(ModalContext)
  const [options, setOptions] = React.useState<SessionOptions>({
    quickMode: false,
    myFollowers: 'Skip',
    myFollowings: 'Skip',
    mutualBlocked: 'Skip',
  })
  const [selectedUser, setSelectedUser] = React.useState<TwitterUser | null>(currentUser)
  const [savedUsers, setSavedUsers] = React.useState(new TwitterUserMap())
  const [selectedUserGroup, selectUserGroup] = React.useState<SelectUserGroup>('current')
  const [isLoading, setLoadingState] = React.useState(false)
  const [targetList, setTargetList] = React.useState<FollowKind>('followers')
  const isAvailable = React.useMemo((): boolean => {
    if (!selectedUser) {
      return false
    }
    if (selectedUser.following) {
      return true
    }
    if (selectedUser.protected || selectedUser.blocked_by) {
      return false
    }
    return true
  }, [selectedUser])
  React.useEffect(() => {
    async function loadUsers() {
      const users = await Storage.loadUsers()
      setSavedUsers(users)
      return users
    }
    loadUsers()
    return Storage.onSavedUsersChanged(async users => {
      await loadUsers()
      if (!(selectedUser && users.has(selectedUser.id_str))) {
        setSelectedUser(currentUser)
        selectUserGroup('current')
      }
    })
  }, [])
  function mutateOptions(newOptionsPart: Partial<SessionOptions>) {
    const newOptions = { ...options, ...newOptionsPart }
    setOptions(newOptions)
  }
  function onExecuteChainBlockButtonClicked() {
    const request: FollowerBlockSessionRequest = {
      purpose: 'chainblock',
      target: {
        type: 'follower',
        user: selectedUser!,
        list: targetList,
      },
      options,
    }
    modalContext.openModal({
      modalType: 'confirm',
      message: TextGenerate.generateFollowerBlockConfirmMessageElement(request),
      callback() {
        startFollowerChainBlock(request)
      },
    })
  }
  function onExecuteUnChainBlockButtonClicked() {
    const request: FollowerBlockSessionRequest = {
      purpose: 'unchainblock',
      target: {
        type: 'follower',
        user: selectedUser!,
        list: targetList,
      },
      options,
    }
    modalContext.openModal({
      modalType: 'confirm',
      message: TextGenerate.generateFollowerBlockConfirmMessageElement(request),
      callback() {
        startFollowerChainBlock(request)
      },
    })
  }
  async function changeUser(userName: string, group: SelectUserGroup) {
    const validUserNamePattern = /^[0-9a-z_]{1,15}$/i
    if (!validUserNamePattern.test(userName)) {
      setSelectedUser(null)
      selectUserGroup('invalid')
      return
    }
    try {
      setLoadingState(true)
      const newUser = await getUserByNameWithCache(userName).catch(() => null)
      if (newUser) {
        setSelectedUser(newUser)
        selectUserGroup(group)
      } else {
        modalContext.openModal({
          modalType: 'alert',
          message: `사용자 @${userName}을(를) 찾을 수 없습니다.`,
        })
        setSelectedUser(null)
        selectUserGroup('invalid')
      }
    } finally {
      setLoadingState(false)
    }
  }
  const firstTab = currentUser && currentUser.following ? 1 : 0
  const [selectedTab, setSelectedTab] = React.useState(firstTab)
  const M = MaterialUI
  return (
    <div>
      <SelectedUserContext.Provider value={selectedUser}>
        <div className="chainblock-target">
          <M.Paper>
            <M.Box padding="10px">
              <M.FormControl component="fieldset" fullWidth={true}>
                <M.FormLabel component="legend">차단 대상</M.FormLabel>
                <TargetSavedUsers
                  currentUser={currentUser}
                  selectedUserGroup={selectedUserGroup}
                  savedUsers={savedUsers}
                  changeUser={changeUser}
                />
              </M.FormControl>
              <hr />
              {isLoading ? (
                <TargetUserProfileEmpty reason="loading" />
              ) : selectedUser ? (
                <TargetUserProfile
                  options={options}
                  mutateOptions={mutateOptions}
                  targetList={targetList}
                  setTargetList={setTargetList}
                  isAvailable={isAvailable}
                />
              ) : (
                <TargetUserProfileEmpty reason="invalid-user" />
              )}
            </M.Box>
          </M.Paper>
          <br />
          <M.Paper>
            <M.Paper variant="outlined">
              <M.Tabs value={selectedTab} onChange={(_ev, val) => setSelectedTab(val)}>
                <M.Tab value={0} label={`\u{1f6d1} 체인블락`} />
                <M.Tab value={1} label={`\u{1f49a} 언체인블락`} />
              </M.Tabs>
            </M.Paper>
            <TabPanel value={selectedTab} index={0}>
              <TargetChainBlockOptions options={options} mutateOptions={mutateOptions} />
              <div className="description">
                위 필터에 해당하지 않는 나머지 사용자를 모두 <mark>차단</mark>합니다. (단, <b>나와 맞팔로우</b>인
                사용자는 위 옵션과 무관하게 <b>차단하지 않습니다</b>.)
              </div>
              <div className="menu">
                <button
                  disabled={!isAvailable}
                  className="menu-item huge-button execute-chainblock"
                  onClick={onExecuteChainBlockButtonClicked}
                >
                  <span>{'\u{1f6d1}'} 체인블락 실행</span>
                </button>
              </div>
            </TabPanel>
            <TabPanel value={selectedTab} index={1}>
              <TargetUnChainBlockOptions options={options} mutateOptions={mutateOptions} />
              <div className="description">
                위 필터에 해당하지 않는 나머지 사용자를 모두 <mark>차단 해제</mark>합니다.
              </div>
              <div className="menu">
                <button
                  disabled={!isAvailable}
                  className="menu-item huge-button execute-unchainblock"
                  onClick={onExecuteUnChainBlockButtonClicked}
                >
                  <span>{'\u{1f49a}'} 언체인블락 실행</span>
                </button>
              </div>
            </TabPanel>
          </M.Paper>
        </div>
      </SelectedUserContext.Provider>
    </div>
  )
}
