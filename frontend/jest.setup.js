jest.mock('canvas', () => ({
    createCanvas: () => ({
      getContext: () => null,
    }),
  }));
  