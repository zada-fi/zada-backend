import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { CommonEntity } from './common'

@Index(['event_id'])
@Index(['key_name', 'status'])
@Index(['pair_address'])
@Entity()
export class PairEvent extends CommonEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: number

  @Column('varchar', { length: 256 })
  event_id: string

  @Column('varchar', { length: 256 })
  pair_address: string

  @Column('varchar', { length: 256 })
  transaction_hash: string

  @Column('varchar', { length: 256 })
  key_name: string

  @Column('text')
  event_data: string

  @Column('datetime', { precision: 6, default: null })
  event_time: Date

  @Column('varchar', { length: 256 })
  cursor: string

  @Column('text')
  source_data: string

  @Column('tinyint', { default: 0 })
  status: number // 0: not purify, 1: purified, 2: purify failed
}
