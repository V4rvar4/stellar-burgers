import {
  createSlice,
  PayloadAction,
  createAsyncThunk,
  createSelector
} from '@reduxjs/toolkit';
import { TIngredient, TConstructorIngredient, TOrder } from '../../utils/types';
import { orderBurgerApi } from '../../utils/burger-api';
import { RootState } from '../../services/store'; // путь к твоему store
import { nanoid } from '@reduxjs/toolkit';

// Состояние конструктора
type TConstructorState = {
  bun: TIngredient | null;
  ingredients: TConstructorIngredient[];
  // Состояния для оформления заказа
  orderRequest: boolean;
  orderModalData: TOrder | null;
  error: string | null;
};

export const initialState: TConstructorState = {
  bun: null,
  ingredients: [],
  orderRequest: false,
  orderModalData: null,
  error: null
};

// Асинхронное действие для оформления заказа
export const makeOrder = createAsyncThunk(
  'constructor/makeOrder',
  async (ingredientsIds: string[], { rejectWithValue }) => {
    try {
      const response = await orderBurgerApi(ingredientsIds);
      if (!response.success) {
        return rejectWithValue('Failed to create order');
      }
      return response.order;
    } catch (error: any) {
      return rejectWithValue(error.message || 'Network error');
    }
  }
);

const constructorSlice = createSlice({
  name: 'constructor',
  initialState,
  reducers: {
    // Добавление ингредиента
    addIngredient: {
      prepare: (item: TIngredient) => {
        const id = nanoid();
        return { payload: { id, ...item } };
      },
      reducer: (state, action: PayloadAction<TConstructorIngredient>) => {
        if (action.payload.type === 'bun') {
          state.bun = action.payload;
        } else {
          state.ingredients.push(action.payload);
        }
      }
    },
    // Удаление ингредиента по ID
    removeIngredient: (state, action: PayloadAction<string>) => {
      state.ingredients = state.ingredients.filter(
        (item) => item.id !== action.payload
      );
    },
    // Перемещение ингредиента (по индексам)
    moveIngredient: (
      state,
      action: PayloadAction<{ fromIndex: number; toIndex: number }>
    ) => {
      const { fromIndex, toIndex } = action.payload;
      const items = [...state.ingredients];
      const [movedItem] = items.splice(fromIndex, 1);
      items.splice(toIndex, 0, movedItem);
      state.ingredients = items;
    },
    // Очистка конструктора
    clearConstructor: (state) => {
      state.bun = null;
      state.ingredients = [];
    },
    // Очистка модального окна заказа
    clearOrderModal: (state) => {
      state.orderModalData = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(makeOrder.pending, (state) => {
        state.orderRequest = true;
        state.error = null;
      })
      .addCase(makeOrder.fulfilled, (state, action) => {
        state.orderRequest = false;
        state.orderModalData = action.payload;
        // Очищаем конструктор после успешного заказа
        state.bun = null;
        state.ingredients = [];
      })
      .addCase(makeOrder.rejected, (state, action) => {
        state.orderRequest = false;
        const payload = action.payload;
        state.error =
          typeof payload === 'string' ? payload : 'Failed to create order';
      });
  }
});

// Селекторы
const selectConstructorState = (state: RootState) => state.burgerConstructor; // <= изменено на 'burgerConstructor'

export const selectConstructorItems = createSelector(
  [selectConstructorState],
  (state) => ({
    bun: state.bun,
    ingredients: state.ingredients
  })
);

export const selectOrderRequest = (state: RootState) =>
  state.burgerConstructor.orderRequest; // <= изменено
export const selectOrderModalData = (state: RootState) =>
  state.burgerConstructor.orderModalData; // <= изменено
export const selectOrderError = (state: RootState) =>
  state.burgerConstructor.error; // <= изменено

// Экспортируем действия
export const {
  addIngredient,
  removeIngredient,
  moveIngredient,
  clearConstructor,
  clearOrderModal
} = constructorSlice.actions;

export default constructorSlice.reducer;
