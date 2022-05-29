
const APP_ID = '97f776b68b4344b9a41e8daa412088c4'

const uid =  String(Math.floor(Math.random() * 10000))
const token = null

let client;
let channel;

const queryString = window.location.search
const urlParams = new URLSearchParams(queryString)
const roomId = urlParams.get('room')

let localStream;
let remoteStream;
let peerConnection;

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302']
    }
  ]
}

const constraints = {
  video: true,
  audio: true,
}

const init = async () => {
  client = await AgoraRTM.createInstance(APP_ID)
  await client.login({ uid, token })

  channel = client.createChannel(roomId)
  await channel.join()
  
  channel.on('MemberLeft', handleUserLeft)
  channel.on('MemberJoined', handleUserJoined)

  client.on('MessageFromPeer', handleMessageFromPeer)

  localStream = await navigator.mediaDevices.getUserMedia(constraints)
  document.getElementById('user-1').srcObject = localStream
}

const handleUserLeft = async (memberId) => {
  document.getElementById('user-2').style.display = 'none'
  document.getElementById('user-1').classList.remove('smallFrame')
}

const handleMessageFromPeer = async (message, memberId) => {
  message = JSON.parse(message.text) 

  if (message.type == 'offer') {
    createAnswer(memberId, message.offer)
  }

  if (message.type == 'answer') {
    addAnswer(message.answer)
  }

  if (message.type == 'candidate') {
    if (peerConnection) {
      peerConnection.addIceCandidate(message.candidate)
    }
  }
}

const handleUserJoined = async (memberId) => {
  console.log('A new user joined the channel: ', memberId)

  createOffer(memberId)
}

const createPeerConnection = async memberId => {
  peerConnection = new RTCPeerConnection(servers)

  remoteStream = new MediaStream()

  document.getElementById('user-2').srcObject = remoteStream
  document.getElementById('user-2').style.display = 'block'

  document.getElementById('user-1').classList.add('smallFrame')

  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: { 'echoCancellation': true } })
    document.getElementById('user-1').srcObject = localStream  
  }

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream)
  })

  peerConnection.addEventListener('track', event => {    
    event.streams[0].getTracks().forEach(track => {
      remoteStream.addTrack(track)
    })
  })

  peerConnection.onicecandidate = async event => {
    if (event.candidate) {
      client.sendMessageToPeer({ text: JSON.stringify({ type: 'candidate', candidate: event.candidate })}, memberId)
    }
  }
}

const createOffer = async memberId => {
  createPeerConnection(memberId)

  const offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)

  client.sendMessageToPeer({ text: JSON.stringify({ type: 'offer', offer: offer })}, memberId)
}

const createAnswer = async (memberId, offer) => {
  await createPeerConnection(memberId)

  await peerConnection.setRemoteDescription(offer)

  const answer = await peerConnection.createAnswer()
  await peerConnection.setLocalDescription(answer)

  client.sendMessageToPeer({ text: JSON.stringify({ type: 'answer', answer: answer })}, memberId)
}

const addAnswer = async (answer) => {
  if (!peerConnection.currentRemoteStream) {
    peerConnection.setRemoteDescription(answer)
  }
}

const leaveChannel = async () => {
  await channel.leave()
  await client.logout()
}


const toggleCamera = () => {
  let videoTrack = localStream.getTracks().find(track => track.kind == 'video')
  
  if (videoTrack.enabled) {
    videoTrack.enabled = false
    document.getElementById('camera-btn').style.backgroundColor = 'rgb(255, 80, 80)'
  } else {
    videoTrack.enabled = true
    document.getElementById('camera-btn').style.backgroundColor = '#6b66f9'

  }
}

const toggleMicrophone = () => {
  let audioTrack = localStream.getTracks().find(track => track.kind === 'audio')  
  if (audioTrack.enabled) {
    audioTrack.enabled = false
    document.getElementById('mic-btn').style.backgroundColor = 'rgb(255, 80, 80)'
  } else {
    audioTrack.enabled = true
    document.getElementById('mic-btn').style.backgroundColor = '#6b66f9'
  }
}

window.addEventListener('beforeunload', leaveChannel)

document.getElementById('camera-btn').addEventListener('click', toggleCamera)
document.getElementById('mic-btn').addEventListener('click', toggleMicrophone)


init()
