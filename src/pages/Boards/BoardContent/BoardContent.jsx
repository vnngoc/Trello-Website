import Box from '@mui/material/Box'
import ListColumns from './ListColumns/ListColumns'
import { mapOrder } from '~/utils/sorts'

import {
    DndContext,
    PointerSensor,
    useSensor,
    MouseSensor,
    TouchSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { useEffect, useState } from 'react'
import Column from './ListColumns/Column/Column'
import Card from './ListColumns/Column/ListCards/Card/Card'


const ACTIVE_DRAG_ITEM_TYPE = {
    COLUMN: 'ACTIVE_DRAG_ITEM_TYPE_COLUMN',
    CARD: 'ACTIVE_DRAG_ITEM_TYPE_CARD'
}

function BoardContent({ board }) {
    // https://docs.dndkit.com/api-documentation/sensors
    const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 10 } })

    // Yêu cầu dùng chuột di chuyển 10px thì mới kích hoạt
    const mouseSensor = useSensor(MouseSensor, { activationConstraint: { distance: 10 } })
    // Yêu cầu nhấn giữ 250ms và dung sai cảm ứng 500px thì mới kích hoạt
    const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 500 } })

    // Ưu tiên dùng mouse và touch để trải nghiệm mobile tốt nhất, không dính bug
    // const sensors = useSensors(pointerSensor)
    const sensors = useSensors(mouseSensor, touchSensor)


    const [orderedColumns, setOrderedColumns] = useState([])
    // Cùng 1 thời điểm có một phần tử được kéo (column hoặc card)
    const [activeDragItemId, setActiveDragItemId] = useState(null)
    const [activeDragItemType, setActiveDragItemType] = useState(null)
    const [activeDragItemData, setActiveDragItemData] = useState(null)


    useEffect(() => {
        setOrderedColumns(mapOrder(board?.columns, board.columnOrderIds, '_id'))
    }, [board])


    // Trigger khi bắt đầu kéo 1 phần tử 
    const handleDragStart = (event) => {
        // console.log('handleDragStart: ', event)
        setActiveDragItemId(event?.active?.id)
        setActiveDragItemType(event?.active?.data?.current?.columnId ? ACTIVE_DRAG_ITEM_TYPE.CARD : ACTIVE_DRAG_ITEM_TYPE.COLUMN)
        setActiveDragItemData(event?.active?.data?.current)
    }

    // Trigger khi kết thúc kéo 1 phần tử = drop thả
    const handleDragEnd = (event) => {
        // console.log('handleDragEnd: ', event)
        const { active, over } = event

        //Kiểm tra nếu không tồn tại over (kéo linh tinh ra ngoài thì return luôn tránh lỗi)
        if (!over) return

        //Nếu vị trí sau khi kéo thả khác với vị trí ban đầu
        if (active.id !== over.id) {
            //lấy vị trí cũ của active
            const oldIndex = orderedColumns.findIndex(c => c._id === active.id)
            //lấy vị trí mới của over
            const newIndex = orderedColumns.findIndex(c => c._id === over.id)

            const dndOrderedColumns = arrayMove(orderedColumns, oldIndex, newIndex)
            // const dndOrderedColumnsIds = dndOrderedColumns.map(c => c._id)
            // console.log('dndOrderedColumns: ', dndOrderedColumns)
            // console.log('dndOrderedColumnsIds: ', dndOrderedColumnsIds)

            //Cập nhật lại state columns ban đầu sau khi đã kéo thả
            setOrderedColumns(dndOrderedColumns)
        }
        setActiveDragItemId(null)
        setActiveDragItemType(null)
        setActiveDragItemData(null)
    }
    // console.log('activeDragItemId: ', activeDragItemId)
    // console.log('setActiveDragItemType: ', activeDragItemType)
    // console.log('setActiveDragItemData: ', activeDragItemData)
    const customDropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: '0.5' } }
        })
    }

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <Box sx={{
                bgcolor: (theme) => (theme.palette.mode === 'dark' ? '#34495e' : '#1976d2'),
                width: '100%',
                height: (theme) => theme.trello.boardContentHeight,
                p: '10px 0'
            }}>
                <ListColumns columns={orderedColumns} />
                <DragOverlay dropAnimation={customDropAnimation}>
                    {(!activeDragItemType) && null}
                    {(activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) && <Column column={activeDragItemData} />}
                    {(activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) && <Card card={activeDragItemData} />}
                </DragOverlay>
            </Box>
        </DndContext>
    )
}

export default BoardContent