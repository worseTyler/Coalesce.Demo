﻿// <auto-generated />
using System;
using Coalesce.Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Storage.ValueConversion;

namespace Coalesce.Domain.Migrations
{
    [DbContext(typeof(AppDbContext))]
    partial class AppDbContextModelSnapshot : ModelSnapshot
    {
        protected override void BuildModel(ModelBuilder modelBuilder)
        {
#pragma warning disable 612, 618
            modelBuilder
                .HasAnnotation("ProductVersion", "2.1.4-rtm-31024")
                .HasAnnotation("Relational:MaxIdentifierLength", 128)
                .HasAnnotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn);

            modelBuilder.Entity("Coalesce.Domain.Case", b =>
                {
                    b.Property<int>("CaseKey")
                        .ValueGeneratedOnAdd()
                        .HasAnnotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn);

                    b.Property<int?>("AssignedToId");

                    b.Property<byte[]>("Attachment");

                    b.Property<string>("Description");

                    b.Property<int?>("DevTeamAssignedId");

                    b.Property<TimeSpan>("Duration");

                    b.Property<DateTimeOffset>("OpenedAt");

                    b.Property<int?>("ReportedById");

                    b.Property<string>("Severity")
                        .IsRequired()
                        .HasMaxLength(20);

                    b.Property<int>("Status");

                    b.Property<string>("Title")
                        .HasMaxLength(250);

                    b.HasKey("CaseKey");

                    b.HasIndex("AssignedToId");

                    b.HasIndex("ReportedById");

                    b.ToTable("Case");
                });

            modelBuilder.Entity("Coalesce.Domain.CaseProduct", b =>
                {
                    b.Property<int>("CaseProductId")
                        .ValueGeneratedOnAdd()
                        .HasAnnotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn);

                    b.Property<int>("CaseId");

                    b.Property<int>("ProductId");

                    b.HasKey("CaseProductId");

                    b.HasIndex("CaseId");

                    b.HasIndex("ProductId");

                    b.ToTable("CaseProduct");
                });

            modelBuilder.Entity("Coalesce.Domain.Company", b =>
                {
                    b.Property<int>("CompanyId")
                        .ValueGeneratedOnAdd()
                        .HasAnnotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn);

                    b.Property<string>("Address1")
                        .HasMaxLength(200);

                    b.Property<string>("Address2")
                        .HasMaxLength(200);

                    b.Property<string>("City")
                        .HasMaxLength(200);

                    b.Property<bool>("IsDeleted");

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasMaxLength(200);

                    b.Property<string>("State")
                        .HasMaxLength(100);

                    b.Property<string>("ZipCode")
                        .HasMaxLength(20);

                    b.HasKey("CompanyId");

                    b.ToTable("Company");
                });

            modelBuilder.Entity("Coalesce.Domain.Person", b =>
                {
                    b.Property<int>("PersonId")
                        .ValueGeneratedOnAdd()
                        .HasAnnotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn);

                    b.Property<DateTime?>("BirthDate");

                    b.Property<int>("CompanyId");

                    b.Property<string>("Email");

                    b.Property<string>("FirstName")
                        .HasMaxLength(75);

                    b.Property<int>("Gender");

                    b.Property<DateTime?>("LastBath");

                    b.Property<string>("LastName")
                        .HasMaxLength(100);

                    b.Property<DateTimeOffset?>("NextUpgrade");

                    b.Property<byte[]>("ProfilePic");

                    b.Property<int>("Title");

                    b.HasKey("PersonId");

                    b.HasIndex("CompanyId");

                    b.ToTable("Person");
                });

            modelBuilder.Entity("Coalesce.Domain.Product", b =>
                {
                    b.Property<int>("ProductId")
                        .ValueGeneratedOnAdd()
                        .HasAnnotation("SqlServer:ValueGenerationStrategy", SqlServerValueGenerationStrategy.IdentityColumn);

                    b.Property<string>("Address")
                        .HasMaxLength(200);

                    b.Property<string>("City")
                        .HasMaxLength(100);

                    b.Property<string>("Name")
                        .IsRequired()
                        .HasMaxLength(200);

                    b.Property<string>("PostalCode")
                        .HasMaxLength(50);

                    b.Property<string>("State")
                        .HasMaxLength(50);

                    b.Property<Guid>("UniqueId")
                        .HasColumnName("ProductUniqueId");

                    b.HasKey("ProductId");

                    b.ToTable("Product");
                });

            modelBuilder.Entity("Coalesce.Domain.Case", b =>
                {
                    b.HasOne("Coalesce.Domain.Person", "AssignedTo")
                        .WithMany("CasesAssigned")
                        .HasForeignKey("AssignedToId");

                    b.HasOne("Coalesce.Domain.Person", "ReportedBy")
                        .WithMany("CasesReported")
                        .HasForeignKey("ReportedById");
                });

            modelBuilder.Entity("Coalesce.Domain.CaseProduct", b =>
                {
                    b.HasOne("Coalesce.Domain.Case", "Case")
                        .WithMany("CaseProducts")
                        .HasForeignKey("CaseId")
                        .OnDelete(DeleteBehavior.Cascade);

                    b.HasOne("Coalesce.Domain.Product", "Product")
                        .WithMany()
                        .HasForeignKey("ProductId")
                        .OnDelete(DeleteBehavior.Cascade);
                });

            modelBuilder.Entity("Coalesce.Domain.Person", b =>
                {
                    b.HasOne("Coalesce.Domain.Company", "Company")
                        .WithMany("Employees")
                        .HasForeignKey("CompanyId")
                        .OnDelete(DeleteBehavior.Cascade);
                });
#pragma warning restore 612, 618
        }
    }
}
