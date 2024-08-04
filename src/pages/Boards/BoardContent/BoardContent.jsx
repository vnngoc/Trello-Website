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
import { cloneDeep } from 'lodash'

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

    // Tìm 1 cái column theo cardId
    const findColumnByCardId = (cardId) => {
        return orderedColumns.find(column => column?.cards?.map(card => card._id)?.includes(cardId))
    }

    // Trigger khi bắt đầu kéo 1 phần tử 
    const handleDragStart = (event) => {
        // console.log('handleDragStart: ', event)
        setActiveDragItemId(event?.active?.id)
        setActiveDragItemType(event?.active?.data?.current?.columnId ? ACTIVE_DRAG_ITEM_TYPE.CARD : ACTIVE_DRAG_ITEM_TYPE.COLUMN)
        setActiveDragItemData(event?.active?.data?.current)
    }

    //Trigger trong quá trình kéo một phần tử
    const handleDragOver = (event) => {

        // Không làm gì thêm khi kéo column
        if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.COLUMN) return

        //Còn nếu kéo card thì xử lý thêm để có thể kéo card qua các columns
        // console.log('handleDragOver: ', event)
        const { active, over } = event

        //Cần đảm bảo nếu không tồn tại active hoặc over (kéo linh tinh ra ngoài thì return luôn tránh lỗi)
        if (!active || !over) return

        // activeDraggingCard: là Card đang kéo
        const { id: activeDraggingCardId, data: { current: activeDraggingCardData } } = active
        // là Card tương tác trên hoặc dưới so với card đươc kéo
        const { id: overCardId } = over
        //Tìm 2 column theo CardId
        const activeColumn = findColumnByCardId(activeDraggingCardId)
        const overColumn = findColumnByCardId(overCardId)
        // console.log('activeColumn: ', activeColumn)
        // console.log('overColumn: ', overColumn)

        //Nếu không tồn tại 1 trong 2 thì crash website
        if (!activeColumn || !overColumn) return
        // Xử lý logic ở đây chỉ kéo card qua 2 column khác nhau, còn nếu kéo card trong chính column ban đầu thì nó ko làm gì
        // Vì ở đây xử lý lúc kéo (handleDragOver), còn xử lý kéo xong xuôi thì nó lại là vấn đề khác ở đây (handleDragEnd)
        if (!activeColumn._id !== overColumn._id) {
            setOrderedColumns(prevColumns => {
                // Tìm vị trí Index của cái overCard trong Column nơi mà activeCard dc thả
                const overCardIndex = overColumn?.cards?.findIndex(card => card._id === overCardId)

                //Logic tính toán cho cardIndex mới (trên hoăc dưới overCard) lấy chuẩn ra từ code của thư viện.
                let newCardIndex
                const isBelowOverItem = active.rect.current.translated &&
                    active.rect.current.translated.top > over.rect.top + over.rect.height
                const modifier = isBelowOverItem ? 1 : 0
                newCardIndex = overCardIndex >= 0 ? overCardIndex + modifier : overColumn?.cards?.length + 1

                //Clone mảng orderedColumnsState cũ ra mới rổi xử lý data rồi return - cập nhật lại orderedColumnsState
                const nextColumns = cloneDeep(prevColumns)
                const nextActiveColumn = nextColumns.find(column => column._id === activeColumn._id)
                const nextOverColumn = nextColumns.find(column => column._id === overColumn._id)

                // nextActiveColumn: column cũ
                if (nextActiveColumn) {
                    // Xóa card ở column active, cái lúc kéo card ra khỏi nó chuyển sang column khác
                    nextActiveColumn.cards = nextActiveColumn.cards.filter(card => card._id !== activeDraggingCardId)

                    // Cập nhật lại mảng cardOrderIds cho chuẩn dữ liệu
                    nextActiveColumn.cardOrderIds = nextActiveColumn.cards.map(card => card._id)
                }
                // nextOverColumn: column mới
                if (nextOverColumn) {
                    // Kiểm tra xem card đang kéo có tồn tại ở overColumn chưa, có thì phải xóa
                    nextOverColumn.cards = nextOverColumn.cards.filter(card => card._id !== activeDraggingCardId)

                    // Bước tiếp theo là thêm cái card đang kéo vào overColumn ch theo vị trí Index mới
                    nextOverColumn.cards = nextOverColumn.cards.toSpliced(newCardIndex, 0, activeDraggingCardData)

                    // Cập nhật lại mảng cardOrderIds cho chuẩn dữ liệu
                    nextOverColumn.cardOrderIds = nextOverColumn.cards.map(card => card._id)
                }
                return nextColumns
            })
        }
    }

    // Trigger khi kết thúc kéo 1 phần tử = drop thả
    const handleDragEnd = (event) => {
        // console.log('handleDragEnd: ', event)

        if (activeDragItemType === ACTIVE_DRAG_ITEM_TYPE.CARD) {
            // console.log('Hành động kéo thả card - tạm thời không làm gì')
            return
        }

        const { active, over } = event

        //Cần đảm bảo nếu không tồn tại active hoặc over (kéo linh tinh ra ngoài thì return luôn tránh lỗi)
        if (!active || !over) return

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
            onDragOver={handleDragOver}
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