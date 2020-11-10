import produce from '../dist/state-tracker.cjs.production.min'
import immerProduce from 'immer'
import cloneDeep from 'lodash.clonedeep'

let nextId = 1;

function buildData(count) {
  const data = new Array(count);
  for (let i = 0; i < count; i++) {
    data[i] = {
      id: nextId++,
      selected: false,
    }
  }
  return { data };
}

const state = buildData(10000)

function measureAccess(name, fn) {
  const copy = cloneDeep(state)
  const start = Date.now()
  fn(copy)
  const end = Date.now()
  console.log(`${name}: `, end - start)
}

// measureAccess('plain object map', (state) => {
//   state.data.map(item => ({
//     ...item
//   }))
// })

measureAccess('state-tracker map', (state) => {
  const proxyState = produce(state)

  // console.log('proxy ', proxyState)

  proxyState.data.map(item => {
    return { ...item }
  })
})

measureAccess('immer map', (state) => {
  const proxyState = immerProduce(state, draft => draft.data.map(item => ({
    ...item
  })))

  // console.log('proxy ', proxyState)
  proxyState.map(item => ({
    ...item
  }))
})

// measureAccess('plain object remove', (state) => {
//   state.data.map(item => ({
//     ...item
//   }))

//   const slice = [...state.data]
//   slice.splice(20, 1)
//   for (let i = 20; i < slice.length; i++) {
//     ({ ...slice[i]})
//   }
// })

// measureAccess('state-tracker remove', (state) => {
//   const proxyState = produce(state)

//   proxyState.data.map(item => ({
//     ...item
//   }))

//   const slice = [...proxyState.data]
//   slice.splice(20, 1)

//   proxyState.relink(['data', slice])
//   const data = proxyState.data

//   for (let i = 20; i < slice.length; i++) {
//     ({ ...data[i] })
//   }
// })

// measureAccess('immer remove', (state) => {
//   const slice = immerProduce(state, draft => draft.data.map(item => ({
//     ...item
//   })))
//   for (let i = 0; i < slice.length; i++) {
//     ({ ...slice[i]})
//   }
//   const nextState = immerProduce(state, draft => {
//     draft.data.splice(20, 1)
//   })

//   for (let i = 20; i < nextState.length; i++) {
//     ({ ...nextState[i]})
//   }
// })