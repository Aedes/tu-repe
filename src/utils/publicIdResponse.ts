type WithPublicId = {
    id?: number | string;
    publicId?: string;
};

export const mapPublicId = <T extends WithPublicId>(
    entity: T
): Omit<T, "publicId" | "id"> & { id?: string } => {
    const { publicId, id: _id, ...rest } = entity;
    return {
        ...rest,
        id: publicId,
    };
};

export const mapPublicIdArray = <T extends WithPublicId>(
    entities: T[]
): Array<Omit<T, "publicId" | "id"> & { id?: string }> => {
    return entities.map(mapPublicId);
};
