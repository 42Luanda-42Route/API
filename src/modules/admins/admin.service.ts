import { PrismaClient } from "@prisma/client";
import  jwt  from "jsonwebtoken";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const adminService = {
    async findAll(){
        return prisma.admins.findMany({ omit: { passwrd: true }});
    },

    async findById(id: number){
        return prisma.admins.findUnique({
            where: {id}, 
            omit: { passwrd: true}
        });
    },

    async create(data: any){
        return prisma.admins.create({data});
    },
    async update(id: number, data: any){
        return prisma.admins.update({
            where: {id},
            data
        });
    },

    async delete(id: number){
        return prisma.admins.delete({
            where: {id}
        });
    },
    
    async findByUsernameOrEmail(usernameOrEmail: string) {
        return prisma.admins.findFirst({
        where: {
            OR: [
            { username: usernameOrEmail },
            { email: usernameOrEmail }
            ]
        }
    })
  },

   async login(username: string, password: string)
      {
        const isAdmin = await this.findByUsernameOrEmail(username);
  
        if (!isAdmin) return { "message": "username or email not found"};
  
        const ok = await bcrypt.compare(password, isAdmin.passwrd ?? '');
        if(!ok) return {"message": "Credenciais erradas"};
  
        const jwtToken = jwt.sign(
          {
            id: isAdmin.id,
            username: isAdmin.username,
            email: isAdmin.email,
          }, 
          process.env.JWT_SECRET as string,
          { expiresIn: "15m" }
        );
  
        return { token: jwtToken};
      }
};