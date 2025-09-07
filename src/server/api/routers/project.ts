import { pollCommits } from "@/lib/github";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { z } from "zod";
import { indexGithubRepo } from "@/lib/github-loader";
import { db } from "@/server/db";
import { askCasualQuestion } from "@/app/(protected)/casualchat/actions";


export const projectRouter = createTRPCRouter({
    createProject: protectedProcedure.input(
        z.object({
            name: z.string(),
            githubUrl: z.string(),
            gitHubToken: z.string().optional()
        })
    ).mutation(async({ctx, input}) => {
        const project = await ctx.db.project.create({
            data: {
                githubUrl: input.githubUrl,
                name: input.name,
                userToProjects: {
                    //@ts-ignore
                    create:{
                        userId: ctx.user.userId
                    }
                }
            }
        })
        await indexGithubRepo(project.id, ctx.user.userId! ,input.githubUrl, input.gitHubToken);
        await pollCommits(project.id)
        return project
    }),

    getProjects: protectedProcedure.query(async({ctx}) => {
        const projects = await ctx.db.project.findMany({
            where: {
                userToProjects: {
                    some: {
                        //@ts-ignore
                        userId: ctx.user.userId
                    }
                },
                deletedAt: null
            }
        })
        return projects
    }),

    getCommits: protectedProcedure.input(
        z.object({
            projectId: z.string()
        })
    ).query(async({ctx, input}) => {
        pollCommits(input.projectId).then().catch(console.error);
        //@ts-ignore
        const commits = await ctx.db.commit.findMany({
            where: {
                projectId: input.projectId
            }
        })
        return commits
    }),

    saveAnswer: protectedProcedure.input(z.object({
        projectId: z.string(), 
        question: z.string(),
        answer: z.string(),
        filesReferences: z.any()
    })).mutation(async({ctx, input}) => {
        //@ts-ignore
        return await ctx.db.question.create({
            data: {
                answer: input.answer,
                filesReferences: input.filesReferences, 
                projectId: input.projectId, 
                question: input.question, 
                userId: ctx.user.userId!

            }
        })
    }),

    getQuestions: protectedProcedure.input(
        z.object({
            projectId: z.string()
        })
    ).query(async({ctx, input}) => {
        return await ctx.db.question.findMany({
            where: {
                projectId: input.projectId
            },
            include: {
                user: true
            },
            orderBy: {
                createdAt: 'desc'
            }
        })
    }),

    archiveProject: protectedProcedure.input(
        z.object({
            projectId: z.string()
        })).mutation(async({ctx, input}) => {
            return await ctx.db.project.update({
                where: {
                    id: input.projectId
                },
                data: {
                    deletedAt: new Date()
                }
            })
        }), 

    getTeamMembers: protectedProcedure.input(
        z.object({
            projectId: z.string()
        })).query(async({ctx, input}) => {
            return await ctx.db.userToProject.findMany({
                where: {
                    projectId: input.projectId
                },
                include: {
                    user: true
                }
            })
        }),

    getProgress: protectedProcedure.query(async ({ ctx }) => {
        const user = await ctx.db.user.findUnique({
            where: { id: ctx.user.userId! },
            //@ts-ignore
            select: { currentProjectId: true, currentFile: true },
        });
        return user;
    }),

    getFileTree: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
      })
    )
    .query(async ({ input }) => {
        if (!input?.projectId) {
            return null; // or [] if you prefer empty result
        }
      const project = await db.project.findUnique({
        where: { id: input.projectId },
        select: { 
            //@ts-ignore
            fileTree: true 
        },
      });
      //@ts-ignore
      return project?.fileTree ?? null;
    }),

    askCasualQuestion: protectedProcedure
    .input(
      z.object({
        projectId: z.string(),
        question: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const output = await askCasualQuestion(input.question, input.projectId);
      return { output };
    }),


    

});