import { LookControls } from './Player'
import Player from './Player'
import House from './House'
import RoomZone from './RoomZone'
import LivingZone from './LivingZone'
import YardZone from './YardZone'
import Rain from './Rain'

export default function Scene() {
  return (
    <>
      <color attach="background" args={['#6f7c8a']} />
      <fog attach="fog" args={['#74808d', 14, 52]} />
      <LookControls />
      <Player />
      <House />
      <RoomZone />
      <LivingZone />
      <YardZone />
      <Rain />
    </>
  )
}
