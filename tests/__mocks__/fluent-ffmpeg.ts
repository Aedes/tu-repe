const ffmpeg = jest.fn(() => ({
    outputOptions: jest.fn().mockReturnThis(),
    save: jest.fn().mockReturnThis(),
    on: jest.fn((event, cb) => {
        if (event === "end") cb();
        return this;
    })
}));

export default ffmpeg;
