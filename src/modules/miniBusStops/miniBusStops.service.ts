import prisma from "../../infrastructure/database/prismaClient";


export const miniBusStopService = {
    async findAll(){
        return prisma.miniBusStop.findMany();
    },

    async findById(id: number){
        return prisma.miniBusStop.findUnique({where: {id}});
    },

    async create(data: any){
        return prisma.miniBusStop.create({data});
    },
    async update(id: number, data: any){
        return prisma.miniBusStop.update({
            where: {id},
            data
        });
    },

    async delete(id: number){
        return prisma.miniBusStop.delete({
            where: {id}
        });
    }
};